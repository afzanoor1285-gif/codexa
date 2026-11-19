from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from models.submission import Submission
from config import Config
from routes.auth import role_required
from Ml.code_detector import is_model_loaded, predict_code as detect_code

submissions_bp = Blueprint('submissions', __name__)

client = MongoClient(Config.MONGO_URI)
db = client['lms_db']
submission_model = Submission(db)

def predict_code(code: str):
    if not is_model_loaded():
        return "Unknown", 0.0
    return detect_code(code)

# Submission creation endpoint moved to `Backend/app.py` as `/api/submissions`.
# Keeping this file for potential future work; for now we only expose GET via the blueprint.


@submissions_bp.route('/', methods=['GET'])
@role_required('teacher')
def get_submissions():
    submissions = submission_model.get_all_submissions()
    return jsonify({'submissions': submissions}), 200