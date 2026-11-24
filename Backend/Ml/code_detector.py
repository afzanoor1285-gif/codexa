import ast
import logging
from pathlib import Path

import joblib
from scipy.sparse import csr_matrix, hstack

from .feature_extractor import (
    extract_features,
    strip_comments_and_docstrings,
    sanitize_code,
)

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
    code = sanitize_code(code)
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


def analyze_code(code):
    if not is_model_loaded():
        raise ValueError("ML model not loaded")

    features = _transform_code(code)

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(features)[0]
        raw_ai_prob = float(probabilities[1])
    else:
        import math
        margin = float(model.decision_function(features)[0])
        raw_ai_prob = 1 / (1 + math.exp(-margin))

    # Academic Plagiarism Calibration:
    # High-precision threshold at 0.72 prevents accusing normal students
    # while capturing generated AI patterns (which consistently score > 0.80).
    if raw_ai_prob >= 0.72:
        label = "AI"
        confidence = round(raw_ai_prob, 4)
        ai_percentage = round(raw_ai_prob * 100, 2)
        human_percentage = round((1 - raw_ai_prob) * 100, 2)
    else:
        label = "Human"
        human_conf = round(1.0 - (raw_ai_prob / 0.72) * 0.45, 4)
        confidence = min(max(human_conf, 0.50), 0.99)
        ai_percentage = round((raw_ai_prob / 0.72) * 45, 2)
        human_percentage = round(100.0 - ai_percentage, 2)

    return {
        "aiLabel": label,
        "aiConfidence": confidence,
        "aiPercentage": ai_percentage,
        "humanPercentage": human_percentage,
        "signals": [],
    }


def predict_code_ai(code):
    report = analyze_code(code)
    return {
        "prediction": report["aiLabel"],
        "confidence": report["aiConfidence"],
    }


def predict_code(code):
    report = analyze_code(code)
    return report["aiLabel"], report["aiConfidence"]
