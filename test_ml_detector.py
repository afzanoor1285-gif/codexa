import pytest
import sys
from pathlib import Path

# Add Backend to sys.path
backend_path = Path(__file__).resolve().parent / "Backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from Ml.code_detector import is_model_loaded, analyze_code, predict_code_ai
from Ml.feature_extractor import extract_features, strip_comments_and_docstrings


def test_model_loading():
    assert is_model_loaded() is True


def test_strip_comments_and_docstrings():
    code = """# Top comment
def hello():
    \"\"\"This is a docstring.\"\"\"
    # Inline comment
    return 'world'
"""
    cleaned = strip_comments_and_docstrings(code)
    assert "# Top comment" not in cleaned
    assert "# Inline comment" not in cleaned
    assert "return 'world'" in cleaned


def test_feature_extractor():
    code = """import os
import sys

# A comment
def hello_world(name: str) -> bool:
    \"\"\"Docstring test.\"\"\"
    if not name:
        return None
    for i in range(3):
        print(f"Hello {name}")
    return True
"""
    feats = extract_features(code)
    assert feats["syntax_valid"] == 1.0
    assert feats["num_functions"] == 1.0
    assert feats["num_returns"] == 2.0
    assert feats["has_type_hints"] == 1.0
    assert feats["docstring_density"] > 0.0
    assert feats["total_lines"] >= 10


def test_analyze_code_structure():
    code = "print('Hello, world!')"
    result = analyze_code(code)
    assert "aiLabel" in result
    assert result["aiLabel"] in ["AI", "Human"]
    assert "aiConfidence" in result
    assert 0.0 <= result["aiConfidence"] <= 1.0
    assert "aiPercentage" in result
    assert "humanPercentage" in result
    assert round(result["aiPercentage"] + result["humanPercentage"], 1) == 100.0


def test_predict_code_ai_compatibility():
    code = "def add(a, b): return a + b"
    pred = predict_code_ai(code)
    assert "prediction" in pred
    assert pred["prediction"] in ["AI", "Human"]
    assert "confidence" in pred
