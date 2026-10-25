from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
import re
from models.assignment import Assignment
from config import Config
from routes.auth import role_required

assignments_bp = Blueprint('assignments', __name__)

client = MongoClient(Config.MONGO_URI)
db = client['lms_db']
assignment_model = Assignment(db)


@assignments_bp.route('/', methods=['POST'])
@role_required('teacher')
def create_assignment():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid request body'}), 400

    title = data.get('title')
    description = data.get('description')
    class_id = data.get('course')
    deadline = data.get('deadline')

    if not all([title, description, class_id, deadline]):
        return jsonify({'error': 'Missing required fields'}), 400
    if not all(isinstance(value, str) for value in (title, description, class_id, deadline)):
        return jsonify({'error': 'Assignment fields must be strings'}), 400

    class_ids = [class_id]
    if ObjectId.is_valid(class_id):
        class_ids.append(ObjectId(class_id))
    if class_id.isdigit():
        class_ids.append(int(class_id))

    class_record = db['classes'].find_one({
        '_id': {'$in': class_ids},
        'teacher_id': request.user_id,
    })
    if not class_record:
        return jsonify({'error': 'Class not found or you do not own this class'}), 404

    assignment_id = assignment_model.create_assignment(
        title.strip(), description.strip(), class_id, request.user_id, deadline
    )
    return jsonify({
        'message': 'Assignment created',
        'assignment_id': assignment_id,
        'class_id': class_id,
    }), 201


@assignments_bp.route('/', methods=['GET'])
@role_required('teacher', 'student')
def get_assignments():
    class_labels = {}
    if request.user_role == 'teacher':
        assignments = list(assignment_model.collection.find({'teacher_id': request.user_id}))
    else:
        student_email = request.current_user.get('email', '').strip().lower()
        classes = db['classes'].find(
            {
                'student_emails': {
                    '$regex': f'^{re.escape(student_email)}$',
                    '$options': 'i',
                }
            },
            {'_id': 1, 'name': 1, 'code': 1},
        )
        class_course_values = []
        for class_record in classes:
            class_id = str(class_record['_id'])
            class_course_values.append(class_id)
            class_labels[class_id] = class_record.get('code') or class_record.get('name', '')
            for label in (class_record.get('code'), class_record.get('name')):
                if label:
                    class_course_values.append(label)
                    class_labels[label] = class_record.get('code') or class_record.get('name', '')

        assignments = list(assignment_model.collection.find({
            'course': {'$in': class_course_values},
        }))
        submissions = assignment_model.collection.database['submissions'].find(
            {
                'studentEmail': {
                    '$regex': f'^{re.escape(student_email)}$',
                    '$options': 'i',
                },
                'assignment_id': {'$in': [str(item['_id']) for item in assignments]},
            },
            {
                '_id': 0,
                'assignment_id': 1,
                'createdAt': 1,
                'gradedAt': 1,
                'status': 1,
                'score': 1,
                'feedback': 1,
                'aiLabel': 1,
                'aiConfidence': 1,
                'humanPercentage': 1,
            },
        )
        submitted_assignments = {
            item['assignment_id']: item
            for item in submissions
        }

    serialized_assignments = []
    for assignment in assignments:
        class_id = str(assignment.get('course', ''))
        deadline = assignment.get('deadline')
        serialized = {
            'id': str(assignment['_id']),
            'title': assignment.get('title', ''),
            'description': assignment.get('description', ''),
            'course': class_labels.get(class_id, class_id) if request.user_role == 'student' else class_id,
            'deadline': deadline.isoformat() if hasattr(deadline, 'isoformat') else deadline,
        }
        if request.user_role == 'student':
            submission = submitted_assignments.get(serialized['id'])
            submitted_at = submission.get('createdAt') if submission else None
            serialized['status'] = (
                'graded'
                if submission and submission.get('score') is not None
                else 'submitted' if submission else 'not_submitted'
            )
            serialized['submittedAt'] = (
                submitted_at.isoformat()
                if hasattr(submitted_at, 'isoformat')
                else submitted_at
            )
            graded_at = submission.get('gradedAt') if submission else None
            serialized['gradedAt'] = (
                graded_at.isoformat()
                if hasattr(graded_at, 'isoformat')
                else graded_at
            )
            serialized['score'] = submission.get('score') if submission else None
            serialized['feedback'] = submission.get('feedback') if submission else None
            serialized['aiLabel'] = submission.get('aiLabel') if submission else None
            serialized['aiConfidence'] = submission.get('aiConfidence') if submission else None
            serialized['humanPercentage'] = (
                submission.get('humanPercentage') if submission else None
            )
        serialized_assignments.append(serialized)

    return jsonify({'assignments': serialized_assignments}), 200
