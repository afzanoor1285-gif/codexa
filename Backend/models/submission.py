from pymongo.database import Database
from datetime import datetime
from bson import ObjectId

class Submission:
    def __init__(self, db: Database):
        self.collection = db['submissions']

    def create_submission(
        self,
        studentName: str,
        studentEmail: str,
        assignmentTitle: str,
        code: str,
        status: str = 'submitted',
        score: int = None,
        plagiarismPercent: float = None,
        aiLabel: str = None,
        aiConfidence: float = None,
        assignment_id: str = None,
        notes: str = None,
        aiPercentage: float = None,
        humanPercentage: float = None,
    ):
        submission_doc = {
            'studentName': studentName,
            'studentEmail': studentEmail,
            'assignmentTitle': assignmentTitle,
            'code': code,
            'status': status,
            'score': score,
            'plagiarismPercent': plagiarismPercent,
            'aiLabel': aiLabel,
            'aiConfidence': aiConfidence,
            'aiPercentage': aiPercentage,
            'humanPercentage': humanPercentage,
            'createdAt': datetime.utcnow()
        }
        if assignment_id is not None:
            submission_doc['assignment_id'] = assignment_id
        if notes:
            submission_doc['notes'] = notes
        result = self.collection.insert_one(submission_doc)
        return str(result.inserted_id)

    def get_all_submissions(self):
        return list(self.collection.find({}, {'_id': 0}))

    def update_submission(
        self,
        submission_id: str,
        status: str = None,
        score: int = None,
        plagiarismPercent: int = None,
        aiPrediction: str = None,
        feedback: str = None,
    ):
        update_doc = {}
        if status is not None:
            update_doc['status'] = status
        if score is not None:
            update_doc['score'] = score
            update_doc['gradedAt'] = datetime.utcnow()
        if plagiarismPercent is not None:
            update_doc['plagiarismPercent'] = plagiarismPercent
        if aiPrediction is not None:
            update_doc['aiPrediction'] = aiPrediction
        if feedback is not None:
            update_doc['feedback'] = feedback
        if update_doc:
            result = self.collection.update_one(
                {'_id': ObjectId(submission_id)},
                {'$set': update_doc},
            )
            return result.matched_count > 0
        return False