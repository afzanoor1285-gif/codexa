import argparse
import ast
import json
import logging
from pathlib import Path

import joblib
import pandas as pd
import sklearn
from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import GroupShuffleSplit, StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

from feature_extractor import extract_features, strip_comments_and_docstrings

logger = logging.getLogger("ai_detector_training")
MODEL_DIRECTORY = Path(__file__).parent / "models"
DATASET_DIRECTORY = Path(__file__).parent / "dataset"
C_VALUES = (0.1, 0.5, 1.0, 2.0, 5.0)


def code_to_ast_sequence(code: str) -> str:
    """
    Convert Python code to a sequence of AST node types.
    This provides syntax-level structure invariant to variable naming or comments.
    """
    try:
        tree = ast.parse(str(code))
        return " ".join(type(node).__name__ for node in ast.walk(tree))
    except Exception:
        return "SYNTAX_ERROR"


def load_dataset(dataset_directory):
    human = pd.read_csv(
        dataset_directory / "human_selected_dataset.csv",
        usecols=["problem_id", "code", "label"],
    )
    generated = pd.read_csv(
        dataset_directory / "created_dataset_with_llms.csv",
        usecols=["problem_id", "code", "label"],
    )

    uni_path = dataset_directory / "university_benchmark_samples.csv"
    if uni_path.exists():
        uni_df = pd.read_csv(uni_path)
        # Weight university lab samples higher so model learns student patterns strongly
        uni_repeated = pd.concat([uni_df] * 5, ignore_index=True)
        dataset = pd.concat([human, generated, uni_repeated], ignore_index=True)
    else:
        dataset = pd.concat([human, generated], ignore_index=True)

    dataset = dataset.dropna(subset=["problem_id", "code"])
    dataset["code"] = dataset["code"].astype(str)
    dataset = dataset.loc[dataset["code"].str.strip().ne("")]
    dataset = dataset.drop_duplicates(subset="code").reset_index(drop=True)
    dataset["label"] = dataset["label"].astype(int)

    # Balance classes (1:1.2 ratio for realistic human bias)
    human_subset = dataset[dataset["label"] == 0]
    ai_subset = dataset[dataset["label"] == 1]
    
    target_count = min(len(human_subset), int(len(ai_subset) * 1.5))
    human_subset = human_subset.sample(n=target_count, random_state=42)
    dataset = pd.concat([human_subset, ai_subset], ignore_index=True).sample(frac=1.0, random_state=42).reset_index(drop=True)

    return dataset


def make_vectorizer():
    return TfidfVectorizer(
        ngram_range=(1, 3),
        max_features=25000,
        sublinear_tf=True,
        token_pattern=r"(?u)\b\w+\b|[^\w\s]",
    )


def make_ast_vectorizer():
    return TfidfVectorizer(
        ngram_range=(2, 4),
        max_features=5000,
        sublinear_tf=True,
    )


def make_model(c_value):
    return LogisticRegression(
        C=c_value,
        class_weight="balanced",
        random_state=42,
        max_iter=2500,
        solver="lbfgs",
    )


def preprocess_codes_for_text(codes):
    return [strip_comments_and_docstrings(code) for code in codes]


def extract_feature_frame(codes):
    return pd.DataFrame([extract_features(code) for code in codes])


def create_training_features(codes, feature_frame=None):
    if feature_frame is None:
        feature_frame = extract_feature_frame(codes)

    clean_codes = preprocess_codes_for_text(codes)
    vectorizer = make_vectorizer()
    text_features = vectorizer.fit_transform(clean_codes)

    ast_seqs = [code_to_ast_sequence(c) for c in codes]
    ast_vectorizer = make_ast_vectorizer()
    ast_features = ast_vectorizer.fit_transform(ast_seqs)

    scaler = StandardScaler()
    structural_features = csr_matrix(scaler.fit_transform(feature_frame))

    combined_features = hstack(
        (text_features, ast_features, structural_features),
        format="csr",
    )
    return combined_features, vectorizer, ast_vectorizer, scaler


def create_validation_features(codes, vectorizer, ast_vectorizer, scaler):
    clean_codes = preprocess_codes_for_text(codes)
    text_features = vectorizer.transform(clean_codes)

    ast_seqs = [code_to_ast_sequence(c) for c in codes]
    ast_features = ast_vectorizer.transform(ast_seqs)

    feature_frame = extract_feature_frame(codes)
    structural_features = csr_matrix(scaler.transform(feature_frame))
    return hstack((text_features, ast_features, structural_features), format="csr")


def score_model(y_true, predictions):
    return {
        "accuracy": float(accuracy_score(y_true, predictions)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, predictions)),
        "macro_f1": float(f1_score(y_true, predictions, average="macro")),
    }


def select_regularization(training_data):
    folds = StratifiedGroupKFold(
        n_splits=3,
        shuffle=True,
        random_state=42,
    )
    feature_frame = extract_feature_frame(training_data["code"].tolist())
    clean_codes = preprocess_codes_for_text(training_data["code"].tolist())
    ast_seqs = [code_to_ast_sequence(c) for c in training_data["code"]]
    fold_features = []

    for training_indices, validation_indices in folds.split(
        training_data["code"],
        training_data["label"],
        groups=training_data["problem_id"],
    ):
        training_codes = [clean_codes[i] for i in training_indices]
        validation_codes = [clean_codes[i] for i in validation_indices]

        vectorizer = make_vectorizer()
        training_text = vectorizer.fit_transform(training_codes)
        validation_text = vectorizer.transform(validation_codes)

        ast_vectorizer = make_ast_vectorizer()
        training_ast = ast_vectorizer.fit_transform([ast_seqs[i] for i in training_indices])
        validation_ast = ast_vectorizer.transform([ast_seqs[i] for i in validation_indices])

        scaler = StandardScaler()
        training_structural = csr_matrix(
            scaler.fit_transform(feature_frame.iloc[training_indices])
        )
        validation_structural = csr_matrix(
            scaler.transform(feature_frame.iloc[validation_indices])
        )
        fold_features.append((
            hstack((training_text, training_ast, training_structural), format="csr"),
            hstack((validation_text, validation_ast, validation_structural), format="csr"),
            training_data["label"].iloc[training_indices].to_numpy(),
            training_data["label"].iloc[validation_indices].to_numpy(),
        ))

    results = {}
    for c_value in C_VALUES:
        fold_scores = []
        for training_features, validation_features, y_train, y_validation in fold_features:
            model = make_model(c_value)
            model.fit(training_features, y_train)
            predictions = model.predict(validation_features)
            fold_scores.append(score_model(y_validation, predictions))

        results[str(c_value)] = {
            metric: sum(fold[metric] for fold in fold_scores) / len(fold_scores)
            for metric in ("balanced_accuracy", "macro_f1")
        }

    best_c = max(
        C_VALUES,
        key=lambda value: (
            results[str(value)]["balanced_accuracy"],
            results[str(value)]["macro_f1"],
        ),
    )
    return best_c, results


def evaluate_holdout(training_data, test_data, c_value):
    training_codes = training_data["code"].tolist()
    x_train, vectorizer, ast_vectorizer, scaler = create_training_features(training_codes)
    model = make_model(c_value)
    model.fit(x_train, training_data["label"])

    train_predictions = model.predict(x_train)
    x_test = create_validation_features(test_data["code"].tolist(), vectorizer, ast_vectorizer, scaler)
    test_predictions = model.predict(x_test)

    return {
        "training": score_model(training_data["label"], train_predictions),
        "test": score_model(test_data["label"], test_predictions),
        "confusion_matrix": confusion_matrix(
            test_data["label"],
            test_predictions,
            labels=[0, 1],
        ).tolist(),
        "classification_report": classification_report(
            test_data["label"],
            test_predictions,
            labels=[0, 1],
            target_names=["Human", "AI"],
            output_dict=True,
            zero_division=0,
        ),
    }


def save_final_model(dataset, c_value):
    codes = dataset["code"].tolist()
    features, vectorizer, ast_vectorizer, scaler = create_training_features(codes)
    model = make_model(c_value)
    model.fit(features, dataset["label"])

    MODEL_DIRECTORY.mkdir(parents=True, exist_ok=True)
    for filename, artifact in (
        ("python_ai_detector.pkl", model),
        ("tfidf_vectorizer.pkl", vectorizer),
        ("ast_vectorizer.pkl", ast_vectorizer),
        ("feature_scaler.pkl", scaler),
    ):
        temporary_path = MODEL_DIRECTORY / (filename + ".tmp")
        joblib.dump(artifact, temporary_path)
        temporary_path.replace(MODEL_DIRECTORY / filename)


def main():
    parser = argparse.ArgumentParser(
        description="Train and evaluate the enhanced AI detector."
    )
    parser.add_argument(
        "dataset_directory",
        type=Path,
        nargs="?",
        default=DATASET_DIRECTORY,
        help="Directory containing the training dataset files",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    dataset = load_dataset(args.dataset_directory)
    train_indices, test_indices = next(
        GroupShuffleSplit(
            n_splits=1,
            test_size=0.2,
            random_state=42,
        ).split(dataset["code"], dataset["label"], groups=dataset["problem_id"])
    )
    training_data = dataset.iloc[train_indices].reset_index(drop=True)
    test_data = dataset.iloc[test_indices].reset_index(drop=True)

    logger.info(
        "Dataset prepared: %s samples (%s problems). Train: %s, Test: %s",
        len(dataset),
        dataset["problem_id"].nunique(),
        len(training_data),
        len(test_data),
    )
    best_c, cv_results = select_regularization(training_data)
    logger.info("Grouped CV: %s | Best C: %s", cv_results, best_c)

    validation = evaluate_holdout(training_data, test_data, best_c)
    logger.info("Holdout Test: %s", validation["test"])

    save_final_model(dataset, best_c)
    metrics = {
        "sklearn_version": sklearn.__version__,
        "selected_c": best_c,
        "dataset_samples": len(dataset),
        "dataset_problems": dataset["problem_id"].nunique(),
        "training_samples": len(training_data),
        "test_samples": len(test_data),
        "grouped_cross_validation": cv_results,
        "holdout_validation": validation,
    }
    (MODEL_DIRECTORY / "validation_metrics.json").write_text(
        json.dumps(metrics, indent=2),
        encoding="utf-8",
    )
    logger.info("Final enhanced model and transformers saved.")


if __name__ == "__main__":
    main()
