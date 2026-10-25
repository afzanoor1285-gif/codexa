from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from models.submission import Submission
from config import Config
from routes.auth import role_required
import os
import pickle
import re

submissions_bp = Blueprint('submissions', __name__)

client = MongoClient(Config.MONGO_URI)
db = client['lms_db']
submission_model = Submission(db)

# Load ML model and vectorizer
model = None
vectorizer = None
try:
    model_path = os.path.join(os.path.dirname(__file__), '..', 'Ml', 'model.pkl')
    vectorizer_path = os.path.join(os.path.dirname(__file__), '..', 'Ml', 'vectorizer.pkl')
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    with open(vectorizer_path, 'rb') as f:
        vectorizer = pickle.load(f)
    print("ML model and vectorizer loaded in submissions!")
except Exception as e:
    print(f"Failed to load ML model or vectorizer in submissions: {e}")

# Preprocess function
def preprocess(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def predict_code(code: str):
    if model is None or vectorizer is None:
        return "Unknown", 0.0
    
    processed = preprocess(code)
    X = vectorizer.transform([processed])
    pred = model.predict(X)[0]
    proba = model.predict_proba(X)[0]
    label = "AI" if pred == 1 else "Human"
    confidence = float(max(proba))
    return label, confidence

# Submission creation endpoint moved to `Backend/app.py` as `/api/submissions`.
# Keeping this file for potential future work; for now we only expose GET via the blueprint.


@submissions_bp.route('/', methods=['GET'])
@role_required('teacher')
def get_submissions():
    submissions = submission_model.get_all_submissions()
    return jsonify({'submissions': submissions}), 200