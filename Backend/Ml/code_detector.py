import logging
import math
from pathlib import Path

import joblib
from scipy.sparse import csr_matrix, hstack

from .feature_extractor import extract_features

logger = logging.getLogger(__name__)
MODEL_DIRECTORY = Path(__file__).parent / "models"

model = None
vectorizer = None
scaler = None

try:
    model = joblib.load(MODEL_DIRECTORY / "python_ai_detector.pkl")
    vectorizer = joblib.load(MODEL_DIRECTORY / "tfidf_vectorizer.pkl")
    scaler = joblib.load(MODEL_DIRECTORY / "feature_scaler.pkl")
    if tuple(model.classes_) != (0, 1):
        raise ValueError("The AI detector must use class 0 for human and class 1 for AI")
    logger.info("Trained AI detector and feature transformers loaded")
    print("ML model and feature transformers loaded successfully.")
except Exception:
    model = None
    vectorizer = None
    scaler = None
    logger.exception("Failed to load the trained AI detector or its feature transformers")


def is_model_loaded():
    return model is not None and vectorizer is not None and scaler is not None


def _sigmoid(value):
    if value >= 0:
        return 1 / (1 + math.exp(-value))
    exp_value = math.exp(value)
    return exp_value / (1 + exp_value)


def _transform_code(code):
    text_features = vectorizer.transform([code])
    structural_features = csr_matrix(scaler.transform(extract_features(code).to_frame().T))
    return hstack((text_features, structural_features), format="csr")


def analyze_code(code):
    if not is_model_loaded():
        raise ValueError("ML model not loaded")

    features = _transform_code(code)
    prediction = int(model.predict(features)[0])
    ai_score = _sigmoid(float(model.decision_function(features)[0]))
    ai_percentage = round(ai_score * 100, 2)
    human_percentage = round((1 - ai_score) * 100, 2)

    return {
        "aiLabel": "AI" if prediction == 1 else "Human",
        "aiConfidence": max(ai_percentage, human_percentage) / 100,
        "aiPercentage": ai_percentage,
        "humanPercentage": human_percentage,
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
