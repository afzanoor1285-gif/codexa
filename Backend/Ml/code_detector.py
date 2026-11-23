import ast
import logging
from pathlib import Path

import joblib
import pandas as pd
from scipy.sparse import csr_matrix, hstack

from .feature_extractor import extract_features, strip_comments_and_docstrings

logger = logging.getLogger(__name__)
MODEL_DIRECTORY = Path(__file__).parent / "models"

model = None
vectorizer = None
ast_vectorizer = None
scaler = None

try:
    model = joblib.load(MODEL_DIRECTORY / "python_ai_detector.pkl")
    vectorizer = joblib.load(MODEL_DIRECTORY / "tfidf_vectorizer.pkl")
    ast_vectorizer = joblib.load(MODEL_DIRECTORY / "ast_vectorizer.pkl")
    scaler = joblib.load(MODEL_DIRECTORY / "feature_scaler.pkl")
    if tuple(model.classes_) != (0, 1):
        raise ValueError("The AI detector must use class 0 for human and class 1 for AI")
    logger.info("Enhanced AI detector and feature transformers loaded")
    print("Enhanced ML model and transformers loaded successfully.")
except Exception:
    model = None
    vectorizer = None
    ast_vectorizer = None
    scaler = None
    logger.exception("Failed to load the trained AI detector or its transformers")


def is_model_loaded():
    return (
        model is not None
        and vectorizer is not None
        and ast_vectorizer is not None
        and scaler is not None
    )


def code_to_ast_sequence(code: str) -> str:
    try:
        tree = ast.parse(str(code))
        return " ".join(type(node).__name__ for node in ast.walk(tree))
    except Exception:
        return "SYNTAX_ERROR"


def _transform_code(code):
    clean_code = strip_comments_and_docstrings(code)
    text_features = vectorizer.transform([clean_code])
    
    ast_seq = code_to_ast_sequence(code)
    ast_features = ast_vectorizer.transform([ast_seq])
    
    structural_features = csr_matrix(scaler.transform(extract_features(code).to_frame().T))
    return hstack((text_features, ast_features, structural_features), format="csr")


def compute_structural_ai_signature(feats: pd.Series) -> tuple[float, list[str]]:
    """
    Computes a structural stylometric signature score [0.0, 1.0] from AST parsing
    and explains the key authorship signals detected in the code.
    """
    score = 0.0
    signals = []

    # Signal 1: Formal type hints (strong AI signature in university coursework)
    has_th = float(feats.get("has_type_hints", 0.0))
    th_density = float(feats.get("type_hint_density", 0.0))
    if has_th > 0:
        weight = 0.45 * min(th_density / 2.0, 1.0)
        score += weight
        signals.append("Formal Python Type Annotations")

    # Signal 2: Formal docstring on def/class (LLMs adhere strictly to docstring generation)
    docstr = float(feats.get("docstring_density", 0.0))
    if docstr > 0.4:
        weight = 0.35 * min(docstr, 1.0)
        score += weight
        signals.append("Structured Documentation Headers")

    # Signal 3: Variable naming conventions & entropy
    single_char = float(feats.get("single_char_ratio", 0.0))
    multiword = float(feats.get("multiword_ratio", 0.0))
    avg_id_len = float(feats.get("avg_id_len", 0.0))
    if single_char == 0.0 and (multiword > 0 or avg_id_len > 6.0):
        score += 0.15
        signals.append("Descriptive multi-word snake_case identifiers")
    elif single_char >= 0.25:
        # Strong human student signature (i, j, n, arr, res, s)
        score -= 0.15
        signals.append("Student-style compact variable naming")

    # Signal 4: Robust structured error handling & resource management
    try_except = float(feats.get("num_try_except", 0.0))
    raises = float(feats.get("num_raises", 0.0))
    with_stmts = float(feats.get("num_with_stmts", 0.0))
    if (try_except > 0 and raises > 0) or with_stmts > 0:
        score += 0.15
        signals.append("Defensive error handling with custom exceptions")

    final_score = max(min(score, 1.0), 0.0)
    return final_score, signals


def analyze_code(code):
    if not is_model_loaded():
        raise ValueError("ML model not loaded")

    features = _transform_code(code)
    feats = extract_features(code)
    structural_score, signals = compute_structural_ai_signature(feats)

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(features)[0]
        raw_ai_prob = float(probabilities[1])
    else:
        import math
        margin = float(model.decision_function(features)[0])
        raw_ai_prob = 1 / (1 + math.exp(-margin))

    # Dual-Head Calibration:
    if structural_score >= 0.75:
        # Overwhelming structural AI signature (typed + docstring + descriptive identifiers)
        calibrated_prob = max(raw_ai_prob, 0.82 + 0.15 * structural_score)
    elif structural_score <= 0.10:
        # Strong human student signature (no type hints, no docstrings, short/single char variables)
        calibrated_prob = min(raw_ai_prob, 0.30)
    else:
        calibrated_prob = 0.55 * raw_ai_prob + 0.45 * structural_score

    calibrated_prob = max(min(calibrated_prob, 0.999), 0.001)

    if calibrated_prob >= 0.70:
        label = "AI"
        confidence = round(calibrated_prob, 4)
        ai_percentage = round(calibrated_prob * 100, 2)
        human_percentage = round((1 - calibrated_prob) * 100, 2)
    else:
        label = "Human"
        human_conf = round(1.0 - (calibrated_prob / 0.70) * 0.45, 4)
        confidence = min(max(human_conf, 0.50), 0.99)
        ai_percentage = round((calibrated_prob / 0.70) * 45, 2)
        human_percentage = round(100.0 - ai_percentage, 2)

    return {
        "aiLabel": label,
        "aiConfidence": confidence,
        "aiPercentage": ai_percentage,
        "humanPercentage": human_percentage,
        "signals": signals,
    }


def predict_code_ai(code):
    report = analyze_code(code)
    return {
        "prediction": report["aiLabel"],
        "confidence": report["aiConfidence"],
        "signals": report.get("signals", []),
    }


def predict_code(code):
    report = analyze_code(code)
    return report["aiLabel"], report["aiConfidence"]
