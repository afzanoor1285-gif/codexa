import argparse
import json
import logging
import math
import statistics
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
from sklearn.svm import LinearSVC

from feature_extractor import extract_features

logger = logging.getLogger("ai_detector_training")
MODEL_DIRECTORY = Path(__file__).parent / "models"
DATASET_DIRECTORY = Path(__file__).parent / "dataset"
C_VALUES = (0.03, 0.05, 0.07, 0.1, 0.12, 0.15, 0.2, 0.3, 1.0, 2.0)


def load_dataset(dataset_directory):
    human = pd.read_csv(
        dataset_directory / "human_selected_dataset.csv",
        usecols=["problem_id", "code", "label"],
    )
    generated = pd.read_csv(
        dataset_directory / "created_dataset_with_llms.csv",
        usecols=["problem_id", "code", "label", "status_in_folder"],
    )

    generated = generated.loc[
        generated["status_in_folder"].eq("Generate"),
        ["problem_id", "code", "label"],
    ]
    dataset = pd.concat([human, generated], ignore_index=True)
    dataset = dataset.dropna(subset=["problem_id", "code"])
    dataset["code"] = dataset["code"].astype(str)
    dataset = dataset.loc[dataset["code"].str.strip().ne("")]
    dataset["label"] = dataset["label"].astype(int)

    conflicting_labels = dataset.groupby("code")["label"].transform("nunique").gt(1)
    if conflicting_labels.any():
        conflict_count = dataset.loc[conflicting_labels, "code"].nunique()
        logger.warning(
            "Excluding %s code snippets (%s rows) with conflicting labels",
            conflict_count,
            int(conflicting_labels.sum()),
        )
        dataset = dataset.loc[~conflicting_labels]

    dataset = dataset.drop_duplicates(subset="code").reset_index(drop=True)

    if set(dataset["label"].unique()) != {0, 1}:
        raise ValueError("The training dataset must include human (0) and AI (1) examples")

    return dataset


def make_vectorizer():
    return TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        max_features=70000,
        sublinear_tf=True,
    )


def make_model(c_value):
    return LinearSVC(
        C=c_value,
        class_weight="balanced",
        random_state=42,
        max_iter=5000,
    )


def extract_feature_frame(codes):
    return pd.DataFrame([extract_features(code) for code in codes])


def create_training_features(codes, feature_frame=None):
    if feature_frame is None:
        feature_frame = extract_feature_frame(codes)

    vectorizer = make_vectorizer()
    text_features = vectorizer.fit_transform(codes)

    scaler = StandardScaler()
    structural_features = csr_matrix(scaler.fit_transform(feature_frame))
    combined_features = hstack(
        (text_features, structural_features),
        format="csr",
    )
    return combined_features, vectorizer, scaler


def create_validation_features(codes, vectorizer, scaler):
    text_features = vectorizer.transform(codes)
    feature_frame = extract_feature_frame(codes)
    structural_features = csr_matrix(scaler.transform(feature_frame))
    return hstack((text_features, structural_features), format="csr")


def score_model(y_true, predictions):
    return {
        "accuracy": float(accuracy_score(y_true, predictions)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, predictions)),
        "macro_f1": float(f1_score(y_true, predictions, average="macro")),
    }


def select_c_with_one_standard_error(fold_scores_by_c):
    mean_scores = {
        c_value: sum(
            fold["balanced_accuracy"] for fold in fold_scores
        ) / len(fold_scores)
        for c_value, fold_scores in fold_scores_by_c.items()
    }
    best_c = max(
        mean_scores,
        key=lambda value: (
            mean_scores[value],
            sum(fold["macro_f1"] for fold in fold_scores_by_c[value])
            / len(fold_scores_by_c[value]),
        ),
    )
    best_fold_scores = [
        fold["balanced_accuracy"] for fold in fold_scores_by_c[best_c]
    ]
    standard_error = statistics.stdev(best_fold_scores) / math.sqrt(
        len(best_fold_scores)
    )
    threshold = mean_scores[best_c] - standard_error
    selected_c = min(
        c_value
        for c_value, mean_score in mean_scores.items()
        if mean_score >= threshold
    )
    return selected_c, mean_scores[best_c], threshold


def select_regularization(training_data):
    folds = StratifiedGroupKFold(
        n_splits=3,
        shuffle=True,
        random_state=42,
    )
    feature_frame = extract_feature_frame(training_data["code"].tolist())
    fold_features = []

    for training_indices, validation_indices in folds.split(
        training_data["code"],
        training_data["label"],
        groups=training_data["problem_id"],
    ):
        training_codes = training_data["code"].iloc[training_indices].tolist()
        validation_codes = training_data["code"].iloc[validation_indices].tolist()

        vectorizer = make_vectorizer()
        training_text = vectorizer.fit_transform(training_codes)
        validation_text = vectorizer.transform(validation_codes)

        scaler = StandardScaler()
        training_structural = csr_matrix(
            scaler.fit_transform(feature_frame.iloc[training_indices])
        )
        validation_structural = csr_matrix(
            scaler.transform(feature_frame.iloc[validation_indices])
        )
        fold_features.append((
            hstack((training_text, training_structural), format="csr"),
            hstack((validation_text, validation_structural), format="csr"),
            training_data["label"].iloc[training_indices].to_numpy(),
            training_data["label"].iloc[validation_indices].to_numpy(),
        ))

    results = {}
    fold_scores_by_c = {}
    for c_value in C_VALUES:
        fold_scores_by_c[c_value] = []
        training_fold_scores = []
        for training_features, validation_features, y_train, y_validation in fold_features:
            model = make_model(c_value)
            model.fit(training_features, y_train)
            training_fold_scores.append(
                score_model(y_train, model.predict(training_features))
            )
            predictions = model.predict(validation_features)
            fold_scores_by_c[c_value].append(
                score_model(y_validation, predictions)
            )

        fold_scores = fold_scores_by_c[c_value]
        results[str(c_value)] = {
            metric: sum(fold[metric] for fold in fold_scores) / len(fold_scores)
            for metric in ("accuracy", "balanced_accuracy", "macro_f1")
        }
        results[str(c_value)]["training"] = {
            metric: sum(fold[metric] for fold in training_fold_scores)
            / len(training_fold_scores)
            for metric in ("accuracy", "balanced_accuracy", "macro_f1")
        }
        results[str(c_value)]["generalization_gap"] = {
            metric: results[str(c_value)]["training"][metric]
            - results[str(c_value)][metric]
            for metric in ("accuracy", "balanced_accuracy", "macro_f1")
        }
        results[str(c_value)]["balanced_accuracy_standard_error"] = (
            statistics.stdev(
                [fold["balanced_accuracy"] for fold in fold_scores]
            ) / math.sqrt(len(fold_scores))
        )

    selected_c, best_mean_score, threshold = select_c_with_one_standard_error(
        fold_scores_by_c
    )
    selection = {
        "criterion": "one_standard_error_balanced_accuracy",
        "best_mean_balanced_accuracy": best_mean_score,
        "one_standard_error_threshold": threshold,
        "selected_c": selected_c,
    }
    return selected_c, results, selection


def evaluate_holdout(training_data, test_data, c_value):
    training_codes = training_data["code"].tolist()
    x_train, vectorizer, scaler = create_training_features(training_codes)
    model = make_model(c_value)
    model.fit(x_train, training_data["label"])

    train_predictions = model.predict(x_train)
    x_test = create_validation_features(test_data["code"].tolist(), vectorizer, scaler)
    test_predictions = model.predict(x_test)
    training_scores = score_model(training_data["label"], train_predictions)
    test_scores = score_model(test_data["label"], test_predictions)

    return {
        "training": training_scores,
        "test": test_scores,
        "generalization_gap": {
            metric: training_scores[metric] - test_scores[metric]
            for metric in ("accuracy", "balanced_accuracy", "macro_f1")
        },
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
    features, vectorizer, scaler = create_training_features(codes)
    model = make_model(c_value)
    model.fit(features, dataset["label"])

    MODEL_DIRECTORY.mkdir(parents=True, exist_ok=True)
    for filename, artifact in (
        ("python_ai_detector.pkl", model),
        ("tfidf_vectorizer.pkl", vectorizer),
        ("feature_scaler.pkl", scaler),
    ):
        temporary_path = MODEL_DIRECTORY / (filename + ".tmp")
        joblib.dump(artifact, temporary_path)
        temporary_path.replace(MODEL_DIRECTORY / filename)


def main():
    parser = argparse.ArgumentParser(
        description="Train and evaluate the AI detector using task-grouped validation."
    )
    parser.add_argument(
        "dataset_directory",
        type=Path,
        nargs="?",
        default=DATASET_DIRECTORY,
        help="Directory containing the human and AI training CSV files",
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
    shared_problems = set(training_data["problem_id"]) & set(test_data["problem_id"])
    if shared_problems:
        raise ValueError("A programming problem leaked across the train/test split")

    logger.info(
        "Using %s examples from %s problems; grouped training/test split is %s/%s examples",
        len(dataset),
        dataset["problem_id"].nunique(),
        len(training_data),
        len(test_data),
    )
    best_c, cv_results, selection = select_regularization(training_data)
    logger.info("Grouped cross-validation results: %s", cv_results)
    logger.info(
        "Selected C=%s using the one-standard-error rule "
        "(best mean balanced accuracy %.4f; threshold %.4f)",
        best_c,
        selection["best_mean_balanced_accuracy"],
        selection["one_standard_error_threshold"],
    )

    validation = evaluate_holdout(training_data, test_data, best_c)
    logger.info("Training split metrics: %s", validation["training"])
    logger.info("Unseen-problem test metrics: %s", validation["test"])
    logger.info("Train/test generalization gap: %s", validation["generalization_gap"])
    logger.info(
        "Test confusion matrix (actual rows: human/AI; predicted columns: human/AI): %s",
        validation["confusion_matrix"],
    )

    save_final_model(dataset, best_c)
    metrics = {
        "sklearn_version": sklearn.__version__,
        "selected_c": best_c,
        "dataset_samples": len(dataset),
        "dataset_problems": dataset["problem_id"].nunique(),
        "training_samples": len(training_data),
        "training_problems": training_data["problem_id"].nunique(),
        "test_samples": len(test_data),
        "test_problems": test_data["problem_id"].nunique(),
        "regularization_selection": selection,
        "grouped_cross_validation": cv_results,
        "holdout_validation": validation,
        "final_model_fit_samples": len(dataset),
    }
    (MODEL_DIRECTORY / "validation_metrics.json").write_text(
        json.dumps(metrics, indent=2),
        encoding="utf-8",
    )
    logger.info("Trained model artifacts and validation metrics saved to %s", MODEL_DIRECTORY)


if __name__ == "__main__":
    main()
