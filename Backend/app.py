from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from config import Config
from routes.auth import STUDENT_DEGREES, auth_bp, role_required
from routes.assignments import assignments_bp
from routes.submissions import submissions_bp
from models.submission import Submission
from services.mail_service import init_mail, send_preference_notification
from Ml.code_detector import (
    analyze_code as analyze_ml_code,
    is_model_loaded,
    predict_code as predict_ml_code,
    predict_code_ai as predict_ml_code_ai,
)
import os
import re
from datetime import datetime
import jwt
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Initialize Flask-Mail
init_mail(app)

def predict_code_ai(code: str):
    """
    Predict if code is AI-generated or Human-written.
    Returns dict with prediction and confidence.
    """
    return predict_ml_code_ai(code)

def predict_code(code: str):
    """
    Predict if code is AI-generated or Human-written.
    Returns tuple: (label, confidence)
    """
    return predict_ml_code(code)

def analyze_code(code: str):
    return analyze_ml_code(code)

# Test MongoDB connection
try:
    client = MongoClient(Config.MONGO_URI)
    db = client['lms_db']
    # Ping the database
    db.command('ping')
    print("Connected to MongoDB successfully!")
    submission_model = Submission(db)
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
    db = None
    submission_model = None

# Ensure upload folder exists
if not os.path.exists(Config.UPLOAD_FOLDER):
    os.makedirs(Config.UPLOAD_FOLDER)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='')
app.register_blueprint(assignments_bp, url_prefix='/assignments')
# NOTE: Submission creation is implemented in this file under `/api/submissions`.
# The blueprint in `routes/submissions.py` also defines a POST endpoint with a different response shape,
# so it is not registered here to avoid API mismatch.
# app.register_blueprint(submissions_bp, url_prefix='/submissions')


@app.route('/')
def home():
    return jsonify({"message": "Codexa backend is running"})

@app.route('/health')
def health():
    return jsonify({"status": "ok"})

@app.route('/api/students')
@role_required('teacher')
def get_students():
    if db is None:
        return jsonify({"error": "Database not connected"}), 500
    students_collection = db['students']
    students_by_email = {
        student['email'].strip().lower(): {
            'name': student.get('name') or student['email'],
            'email': student['email'].strip().lower(),
            'degree': student.get('degree'),
            'semester': student.get('semester'),
        }
        for student in students_collection.find(
            {'email': {'$type': 'string'}},
            {'_id': 0, 'name': 1, 'email': 1, 'degree': 1, 'semester': 1},
        )
    }
    registered_students = db['users'].find(
        {'role': 'student', 'email': {'$type': 'string'}},
        {'_id': 0, 'name': 1, 'email': 1, 'degree': 1, 'semester': 1},
    )
    for student in registered_students:
        email = student['email'].strip().lower()
        students_by_email[email] = {
            'name': student.get('name') or email,
            'email': email,
            'degree': student.get('degree'),
            'semester': student.get('semester'),
        }

    students = sorted(students_by_email.values(), key=lambda student: student['name'].lower())
    return jsonify({"students": students})

def create_course_invitation_notification(email, class_id, class_record, teacher_name):
    db['notifications'].insert_one({
        'recipient_email': email,
        'type': 'course_invitation',
        'title': 'Course registration requested',
        'message': f"{teacher_name} invited you to register for {class_record.get('name', 'a course')} ({class_record.get('code', '')}).",
        'course_id': class_id,
        'course_name': class_record.get('name', ''),
        'teacher_name': teacher_name,
        'created_at': datetime.utcnow(),
        'read': False,
    })

@app.route('/api/students', methods=['POST'])
@role_required('teacher')
def add_student():
    if db is None:
        return jsonify({"error": "Database not connected"}), 500
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request body"}), 400
    name = data.get('name')
    email = data.get('email')
    degree = data.get('degree')
    if not isinstance(name, str) or not name.strip() or not isinstance(email, str) or not email.strip():
        return jsonify({"error": "Name and email are required"}), 400
    semester = data.get('semester')
    if not isinstance(degree, str) or degree not in STUDENT_DEGREES:
        return jsonify({"error": "A valid student program is required"}), 400
    if type(semester) is not int or semester not in range(1, 9):
        return jsonify({"error": "Select a semester from 1 to 8"}), 400
    students_collection = db['students']
    students_collection.insert_one({
        "name": name.strip(),
        "email": email.strip().lower(),
        "degree": degree,
        "semester": semester,
    })
    print(f"Added student: {name}, {email}")
    return jsonify({"message": "Student added"}), 201

@app.route('/api/submissions', methods=['POST'])
@role_required('student')
def create_submission():
    if submission_model is None:
        return jsonify({"error": "Database not connected"}), 500
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request body"}), 400

    assignment_id = data.get('assignment_id')
    code = data.get('code')
    notes = data.get('notes', '')
    if not isinstance(assignment_id, str) or not ObjectId.is_valid(assignment_id):
        return jsonify({"error": "A valid assignment is required"}), 400
    if not isinstance(code, str) or not code.strip():
        return jsonify({"error": "Upload a code file or enter your code before submitting"}), 400
    if not isinstance(notes, str):
        return jsonify({"error": "Notes must be text"}), 400

    assignment = db['assignments'].find_one({'_id': ObjectId(assignment_id)})
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404

    student_email = request.current_user.get('email', '').strip()
    enrolled_classes = list(db['classes'].find(
        {
            'student_emails': {
                '$regex': f'^{re.escape(student_email)}$',
                '$options': 'i',
            }
        },
        {'_id': 1, 'name': 1, 'code': 1},
    ))
    enrolled_course_ids = {
        str(class_record['_id']) for class_record in enrolled_classes
    }
    enrolled_course_labels = {
        label
        for class_record in enrolled_classes
        for label in (class_record.get('name'), class_record.get('code'))
        if label
    }
    assignment_course = str(assignment.get('course', ''))
    if (
        assignment_course not in enrolled_course_ids
        and assignment_course not in enrolled_course_labels
    ):
        return jsonify({"error": "You are not enrolled in this assignment's class"}), 403

    already_submitted = submission_model.collection.find_one({
        'assignment_id': assignment_id,
        'studentEmail': {
            '$regex': f'^{re.escape(student_email)}$',
            '$options': 'i',
        },
    })
    if already_submitted:
        return jsonify({"error": "You have already submitted this assignment"}), 409

    student_name = request.current_user.get('name') or student_email.split('@')[0]
    assignment_title = assignment.get('title', 'Assignment')
    ai_report = None
    try:
        ai_report = analyze_code(code)
    except Exception as e:
        app.logger.warning("AI prediction failed for assignment submission: %s", e)

    submission_id = submission_model.create_submission(
        studentName=student_name,
        studentEmail=student_email,
        assignmentTitle=assignment_title,
        code=code.strip(),
        status='submitted',
        plagiarismPercent=None,
        aiLabel=ai_report['aiLabel'] if ai_report else None,
        aiConfidence=ai_report['aiConfidence'] if ai_report else None,
        aiPercentage=ai_report['aiPercentage'] if ai_report else None,
        humanPercentage=ai_report['humanPercentage'] if ai_report else None,
        assignment_id=assignment_id,
        notes=notes.strip() or None,
    )
    assignment_teacher_id = assignment.get('teacher_id')
    teacher = None
    if isinstance(assignment_teacher_id, str) and ObjectId.is_valid(assignment_teacher_id):
        teacher = db['users'].find_one({'_id': ObjectId(assignment_teacher_id)})
    teacher_submission_notifications = (
        teacher.get('settings', {}).get('assignment', {}).get('submission_notifications', True)
        if teacher else False
    )
    if teacher and teacher_submission_notifications:
        send_preference_notification(
            teacher,
            'submission_received',
            'New assignment submission',
            f"{student_name} submitted {assignment_title}. Sign in to Codexa to review it.",
        )
    send_preference_notification(
        request.current_user,
        'submission_confirmation',
        'Assignment submitted',
        f"Your submission for {assignment_title} was received by Codexa.",
    )
    if ai_report:
        send_preference_notification(
            request.current_user,
            'code_analysis_completed',
            'Code analysis completed',
            f"The authorship estimate for {assignment_title} is ready. Sign in to Codexa to view your submission.",
        )

    submission = {
        "id": submission_id,
        "assignment_id": assignment_id,
        "studentName": student_name,
        "studentEmail": student_email,
        "assignmentTitle": assignment_title,
        "aiLabel": ai_report['aiLabel'] if ai_report else None,
        "aiConfidence": ai_report['aiConfidence'] if ai_report else None,
        "aiPercentage": ai_report['aiPercentage'] if ai_report else None,
        "humanPercentage": ai_report['humanPercentage'] if ai_report else None,
        "status": 'submitted',
        "createdAt": datetime.utcnow().isoformat(),
    }
    return jsonify({"message": "Submission created", "submission": submission}), 201

@app.route('/api/submissions', methods=['GET'])
@role_required('teacher')
def get_submissions():
    if submission_model is None:
        return jsonify({"error": "Database not connected"}), 500
    assignment_ids = [
        str(assignment['_id'])
        for assignment in db['assignments'].find(
            {'teacher_id': request.user_id},
            {'_id': 1},
        )
    ]
    submissions = list(db['submissions'].find({
        'assignment_id': {'$in': assignment_ids},
    }))
    for submission in submissions:
        submission['_id'] = str(submission['_id'])
        created_at = submission.get('createdAt')
        if hasattr(created_at, 'isoformat'):
            submission['createdAt'] = created_at.isoformat()
    return jsonify({"submissions": submissions}), 200

@app.route('/api/student/grades', methods=['GET'])
@role_required('student')
def get_student_grades():
    if submission_model is None:
        return jsonify({"error": "Database not connected"}), 500

    student_email = request.current_user.get('email', '').strip()
    if not student_email:
        return jsonify({"error": "Student email is unavailable"}), 400

    records = list(db['submissions'].find(
        {
            'studentEmail': {
                '$regex': f'^{re.escape(student_email)}$',
                '$options': 'i',
            },
        },
        {
            '_id': 1,
            'assignment_id': 1,
            'assignmentTitle': 1,
            'createdAt': 1,
            'gradedAt': 1,
            'status': 1,
            'score': 1,
            'feedback': 1,
            'aiLabel': 1,
            'aiConfidence': 1,
            'humanPercentage': 1,
        },
    ))
    assignment_ids = {
        str(record.get('assignment_id'))
        for record in records
        if ObjectId.is_valid(str(record.get('assignment_id', '')))
    }
    assignments_by_id = {
        str(assignment['_id']): assignment
        for assignment in db['assignments'].find(
            {'_id': {'$in': [ObjectId(assignment_id) for assignment_id in assignment_ids]}},
        {
            '_id': 1,
            'title': 1,
            'description': 1,
            'course': 1,
            'deadline': 1,
            'assignment_number': 1,
        },
    )
    }

    grades = []
    for record in records:
        assignment_id = str(record.get('assignment_id', ''))
        assignment = assignments_by_id.get(assignment_id, {})
        created_at = record.get('createdAt')
        graded_at = record.get('gradedAt')
        grades.append({
            'assignmentId': assignment_id,
            'title': assignment.get('title') or record.get('assignmentTitle', 'Assignment'),
            'description': assignment.get('description', ''),
            'course': str(assignment.get('course', '')),
            'assignment_number': assignment.get('assignment_number'),
            'deadline': (
                assignment['deadline'].isoformat()
                if hasattr(assignment.get('deadline'), 'isoformat')
                else assignment.get('deadline')
            ),
            'status': (
                'graded' if record.get('score') is not None
                else record.get('status', 'submitted')
            ),
            'submittedAt': (
                created_at.isoformat()
                if hasattr(created_at, 'isoformat')
                else created_at
            ),
            'gradedAt': (
                graded_at.isoformat()
                if hasattr(graded_at, 'isoformat')
                else graded_at
            ),
            'score': record.get('score'),
            'feedback': record.get('feedback'),
            'aiLabel': record.get('aiLabel'),
            'aiConfidence': record.get('aiConfidence'),
            'humanPercentage': record.get('humanPercentage'),
        })

    return jsonify({'grades': grades}), 200

@app.route('/api/submissions/<submission_id>', methods=['GET'])
@role_required('teacher')
def get_submission_report(submission_id):
    if submission_model is None:
        return jsonify({"error": "Database not connected"}), 500
    if not ObjectId.is_valid(submission_id):
        return jsonify({"error": "Submission not found"}), 404

    submission = db['submissions'].find_one({'_id': ObjectId(submission_id)})
    if not submission:
        return jsonify({"error": "Submission not found"}), 404
    if not ObjectId.is_valid(str(submission.get('assignment_id', ''))):
        return jsonify({"error": "Submission not found"}), 404
    assignment = db['assignments'].find_one({
        '_id': ObjectId(submission['assignment_id']),
        'teacher_id': request.user_id,
    })
    if not assignment:
        return jsonify({"error": "Submission not found"}), 404

    ai_report = {
        'aiLabel': submission.get('aiLabel'),
        'aiConfidence': submission.get('aiConfidence'),
        'aiPercentage': submission.get('aiPercentage'),
        'humanPercentage': submission.get('humanPercentage'),
    }
    if ai_report['aiPercentage'] is None or ai_report['humanPercentage'] is None:
        try:
            ai_report = analyze_code(submission.get('code', ''))
        except Exception as e:
            app.logger.warning("AI report unavailable for submission %s: %s", submission_id, e)

    created_at = submission.get('createdAt')
    if hasattr(created_at, 'isoformat'):
        created_at = created_at.isoformat()
    course = str(assignment.get('course', ''))
    class_record = db['classes'].find_one({
        'teacher_id': request.user_id,
        '$or': [
            {'_id': ObjectId(course)} if ObjectId.is_valid(course) else {'_id': None},
            {'code': course},
            {'name': course},
        ],
    }, {'name': 1, 'code': 1})
    return jsonify({
        'submission': {
            'id': str(submission['_id']),
            'studentName': submission.get('studentName'),
            'studentEmail': submission.get('studentEmail'),
            'assignmentTitle': assignment.get('title', submission.get('assignmentTitle')),
            'className': class_record.get('name') or class_record.get('code') if class_record else course,
            'createdAt': created_at,
            'status': submission.get('status'),
            'score': submission.get('score'),
            'feedback': submission.get('feedback'),
            'notes': submission.get('notes'),
            'code': submission.get('code', ''),
            **ai_report,
        },
    }), 200

@app.route('/api/submissions/<submission_id>/download', methods=['GET'])
@role_required('teacher')
def download_submission(submission_id):
    if submission_model is None:
        return jsonify({"error": "Database not connected"}), 500
    if not ObjectId.is_valid(submission_id):
        return jsonify({"error": "Submission not found"}), 404

    submission = db['submissions'].find_one({'_id': ObjectId(submission_id)})
    if not submission:
        return jsonify({"error": "Submission not found"}), 404
    if not ObjectId.is_valid(str(submission.get('assignment_id', ''))):
        return jsonify({"error": "Submission not found"}), 404
    assignment = db['assignments'].find_one({
        '_id': ObjectId(submission['assignment_id']),
        'teacher_id': request.user_id,
    })
    if not assignment:
        return jsonify({"error": "Submission not found"}), 404

    filename = secure_filename(
        f"{submission.get('studentName', 'student')}-{assignment.get('title', 'submission')}.txt"
    ) or 'submission.txt'
    response = Response(submission.get('code', ''), mimetype='text/plain; charset=utf-8')
    response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response, 200

@app.route('/api/submissions/<submission_id>', methods=['PUT'])
@role_required('teacher')
def update_submission(submission_id):
    if submission_model is None:
        return jsonify({"error": "Database not connected"}), 500
    if not ObjectId.is_valid(submission_id):
        return jsonify({"error": "Submission not found"}), 404
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request body"}), 400

    submission = db['submissions'].find_one({'_id': ObjectId(submission_id)})
    if not submission or not ObjectId.is_valid(str(submission.get('assignment_id', ''))):
        return jsonify({"error": "Submission not found"}), 404
    assignment = db['assignments'].find_one({
        '_id': ObjectId(submission['assignment_id']),
        'teacher_id': request.user_id,
    })
    if not assignment:
        return jsonify({"error": "Submission not found"}), 404

    status = data.get('status')
    score = data.get('score')
    feedback = data.get('feedback')
    ai_prediction = data.get('aiPrediction')
    if status is not None and status not in ('submitted', 'reviewed', 'graded'):
        return jsonify({"error": "Invalid submission status"}), 400
    if score is not None and (not isinstance(score, (int, float)) or isinstance(score, bool) or not 0 <= score <= 100):
        return jsonify({"error": "Score must be a number from 0 to 100"}), 400
    if feedback is not None and (not isinstance(feedback, str) or len(feedback.strip()) > 5000):
        return jsonify({"error": "Feedback must be 5000 characters or fewer"}), 400
    if ai_prediction is not None and ai_prediction not in ('AI', 'Human'):
        return jsonify({"error": "Invalid AI prediction"}), 400

    updated = submission_model.update_submission(
        submission_id,
        status='graded' if score is not None else status,
        score=score,
        aiPrediction=ai_prediction,
        feedback=feedback.strip() if feedback is not None else None,
    )
    if not updated:
        return jsonify({"error": "Submission grade could not be saved"}), 500
    student = db['users'].find_one({
        'email': {
            '$regex': f'^{re.escape(submission.get("studentEmail", ""))}$',
            '$options': 'i',
        },
        'role': 'student',
    })
    if student:
        assignment_title = assignment.get('title', submission.get('assignmentTitle', 'assignment'))
        if feedback is not None:
            send_preference_notification(
                student,
                'teacher_feedback',
                'Teacher feedback is available',
                f"Your teacher left feedback on {assignment_title}. Sign in to Codexa to view it.",
            )
        if score is not None:
            send_preference_notification(
                student,
                'grades_published',
                'Your grade is available',
                f"A grade for {assignment_title} has been published. Sign in to Codexa to view it.",
            )
    return jsonify({"message": "Submission updated"}), 200

@app.route('/predict-ai', methods=['POST'])
@role_required('teacher', 'student')
def predict_ai():
    """
    Predict if the provided code is AI-generated or Human-written.
    Accepts plain text or JSON with 'code' or 'text' key.
    Returns JSON with prediction and confidence.
    """
    if not is_model_loaded():
        return jsonify({"error": "ML model not loaded"}), 500
    
    # Handle different content types
    content_type = request.content_type or ''
    if 'application/json' in content_type:
        try:
            data = request.get_json()
            code = data.get('code') or data.get('text')
        except Exception as e:
            return jsonify({"error": "Invalid JSON"}), 400
    else:
        # Assume plain text
        try:
            code = request.data.decode('utf-8')
        except UnicodeDecodeError:
            return jsonify({"error": "Invalid text encoding"}), 400
    
    if not code or not code.strip():
        return jsonify({"error": "Code is required"}), 400
    
    try:
        return jsonify(predict_ml_code_ai(code))
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

@app.route('/api/classes', methods=['GET'])
@role_required('teacher')
def get_classes():
    """Get all classes for the teacher"""
    if db is None:
        return jsonify({"error": "Database not connected"}), 500
    
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token is missing'}), 401
    
    try:
        # Extract token from "Bearer <token>"
        token = token.split(" ")[1]
        data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = data['user_id']
        user_role = data['role']
    except:
        return jsonify({'error': 'Token is invalid'}), 401
    
    if user_role != 'teacher':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get classes collection or create mock data
    classes_collection = db['classes']
    classes = list(classes_collection.find({'teacher_id': user_id}))
    
    # Convert ObjectId to string for JSON serialization
    for cls in classes:
        cls['_id'] = str(cls['_id'])
        cls['id'] = cls['_id']
        cls['studentCount'] = (
            len(cls['student_emails'])
            if isinstance(cls.get('student_emails'), list)
            else cls.get('student_count', 0)
        )
        cls['invitedCount'] = (
            len(cls['invited_emails'])
            if isinstance(cls.get('invited_emails'), list)
            else 0
        )

    return jsonify({"classes": classes}), 200

@app.route('/api/student/classes', methods=['GET'])
@role_required('student')
def get_student_classes():
    if db is None:
        return jsonify({"error": "Database not connected"}), 500
    degree = request.current_user.get('degree')
    semester = request.current_user.get('semester')
    if not degree or type(semester) is not int:
        return jsonify({"error": "Add your degree and semester in profile settings to find classes"}), 400

    email = request.current_user.get('email', '').strip().lower()
    classes = list(db['classes'].find(
        {'degree': degree, 'semester': semester},
        {'name': 1, 'code': 1, 'section': 1, 'degree': 1, 'semester': 1,
         'teacher_id': 1, 'student_emails': 1, 'invited_emails': 1},
    ))
    result = []
    for class_record in classes:
        teacher_id = class_record.get('teacher_id', '')
        teacher = None
        if isinstance(teacher_id, str) and ObjectId.is_valid(teacher_id):
            teacher = db['users'].find_one(
                {'_id': ObjectId(teacher_id)},
                {'_id': 0, 'name': 1},
            )
        class_record['id'] = str(class_record.pop('_id'))
        class_record['teacherName'] = (
            teacher.get('name') if teacher else None
        ) or 'Teacher'
        enrolled_emails = class_record.get('student_emails', [])
        if not isinstance(enrolled_emails, list):
            enrolled_emails = []
        class_record['enrolled'] = any(
            isinstance(student_email, str) and student_email.strip().lower() == email
            for student_email in enrolled_emails
        )
        invited_emails = class_record.get('invited_emails', [])
        if not isinstance(invited_emails, list):
            invited_emails = []
        class_record['invited'] = any(
            isinstance(student_email, str) and student_email.strip().lower() == email
            for student_email in invited_emails
        )
        class_record.pop('student_emails', None)
        class_record.pop('invited_emails', None)
        class_record.pop('teacher_id', None)
        result.append(class_record)

    return jsonify({'classes': result}), 200

@app.route('/api/student/notifications', methods=['GET'])
@role_required('student')
def get_student_notifications():
    if db is None:
        return jsonify({"error": "Database not connected"}), 500
    email = request.current_user.get('email', '').strip().lower()
    notifications = list(db['notifications'].find(
        {
            'recipient_email': email,
            'type': 'course_invitation',
            'read': {'$ne': True},
        },
    ).sort('created_at', -1).limit(50))
    for notification in notifications:
        notification['id'] = str(notification.pop('_id'))
        created_at = notification.get('created_at')
        notification['created_at'] = (
            created_at.isoformat()
            if hasattr(created_at, 'isoformat')
            else created_at
        )
    return jsonify({'notifications': notifications}), 200

@app.route('/api/student/notifications/<notification_id>/read', methods=['POST'])
@role_required('student')
def mark_student_notification_read(notification_id):
    if db is None:
        return jsonify({"error": "Database not connected"}), 500
    if not ObjectId.is_valid(notification_id):
        return jsonify({"error": "Notification not found"}), 404
    result = db['notifications'].update_one(
        {
            '_id': ObjectId(notification_id),
            'recipient_email': request.current_user.get('email', '').strip().lower(),
        },
        {'$set': {'read': True}},
    )
    if result.matched_count != 1:
        return jsonify({"error": "Notification not found"}), 404
    return jsonify({'message': 'Notification marked as read'}), 200

@app.route('/api/classes/<class_id>/enroll', methods=['POST'])
@role_required('student')
def enroll_in_class(class_id):
    if db is None:
        return jsonify({"error": "Database not connected"}), 500
    if not ObjectId.is_valid(class_id):
        return jsonify({"error": "Class not found"}), 404

    student = request.current_user
    if not student.get('degree') or type(student.get('semester')) is not int:
        return jsonify({"error": "Add your degree and semester in profile settings before enrolling"}), 400

    classes_collection = db['classes']
    class_record = classes_collection.find_one({'_id': ObjectId(class_id)})
    if not class_record:
        return jsonify({"error": "Class not found"}), 404
    if (
        class_record.get('degree') != student.get('degree')
        or class_record.get('semester') != student.get('semester')
    ):
        return jsonify({"error": "This class is not for your degree and semester"}), 403

    email = student.get('email', '').strip().lower()
    existing_emails = class_record.get('student_emails', [])
    if not isinstance(existing_emails, list):
        existing_emails = []
    if any(
        isinstance(enrolled_email, str) and enrolled_email.strip().lower() == email
        for enrolled_email in existing_emails
    ):
        return jsonify({'message': 'You are already enrolled in this class'}), 200

    enrollment_result = classes_collection.update_one(
        {'_id': ObjectId(class_id)},
        {'$addToSet': {'student_emails': email}},
    )
    if enrollment_result.matched_count != 1:
        return jsonify({"error": "Class not found"}), 404
    db['notifications'].update_many(
        {
            'recipient_email': email,
            'course_id': class_id,
            'type': 'course_invitation',
        },
        {'$set': {'read': True}},
    )
    return jsonify({
        'message': 'You are enrolled in this class',
        'class': {
            'id': class_id,
            'name': class_record.get('name'),
        },
    }), 200

@app.route('/api/classes', methods=['POST'])
@role_required('teacher')
def create_class():
    if db is None:
        return jsonify({"error": "Database not connected"}), 500

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request body"}), 400

    name = data.get('name')
    code = data.get('code')
    section = data.get('section')
    degree = data.get('degree')
    semester = data.get('semester')
    student_emails = data.get('invited_emails', data.get('student_emails', []))

    if not all(isinstance(value, str) and value.strip() for value in (name, code, section)):
        return jsonify({"error": "Class name, code, and section are required"}), 400
    if not isinstance(degree, str) or (
        degree not in STUDENT_DEGREES and degree != 'UNSPECIFIED'
    ):
        return jsonify({"error": "A valid class program is required"}), 400
    if type(semester) is not int or semester not in range(1, 9):
        return jsonify({"error": "Select a semester from 1 to 8"}), 400
    if not isinstance(student_emails, list) or any(
        not isinstance(email, str) or not email.strip()
        for email in student_emails
    ):
        return jsonify({"error": "Student emails must be a list of valid emails"}), 400

    normalized_emails = list(dict.fromkeys(email.strip().lower() for email in student_emails))
    classes_collection = db['classes']
    if classes_collection.find_one({
        'teacher_id': request.user_id,
        'code': {'$regex': f'^{re.escape(code.strip())}$', '$options': 'i'},
    }):
        return jsonify({"error": "You already have a class with this code"}), 409

    available_students = {
        student['email'].strip().lower(): (
            student.get('degree'),
            student.get('semester'),
        )
        for student in db['students'].find(
            {'email': {'$type': 'string'}},
            {'_id': 0, 'email': 1, 'degree': 1, 'semester': 1},
        )
    }
    available_students.update(
        {
            student['email'].strip().lower(): (
                student.get('degree'),
                student.get('semester'),
            )
            for student in db['users'].find(
                {'role': 'student', 'email': {'$type': 'string'}},
                {'_id': 0, 'email': 1, 'degree': 1, 'semester': 1},
            )
        }
    )
    if any(email not in available_students for email in normalized_emails):
        return jsonify({"error": "One or more selected students are no longer available"}), 400
    if any(
        (
            available_students[email][0] or 'UNSPECIFIED',
            available_students[email][1],
        ) != (degree, semester)
        for email in normalized_emails
    ):
        return jsonify({"error": "All selected students must match the class program and semester"}), 400

    class_record = {
        'name': name.strip(),
        'code': code.strip(),
        'section': section.strip(),
        'degree': degree,
        'semester': semester,
        'teacher_id': request.user_id,
        'student_emails': [],
        'invited_emails': normalized_emails,
        'student_count': 0,
    }
    result = classes_collection.insert_one(class_record)
    class_id = str(result.inserted_id)
    teacher = db['users'].find_one(
        {'_id': ObjectId(request.user_id)} if ObjectId.is_valid(request.user_id) else {'_id': request.user_id},
        {'name': 1},
    )
    teacher_name = (teacher.get('name') if teacher else None) or 'Your teacher'
    for email in normalized_emails:
        create_course_invitation_notification(email, class_id, class_record, teacher_name)

    return jsonify({
        'message': 'Class created',
        'class': {
            'id': class_id,
            'name': class_record['name'],
            'code': class_record['code'],
            'section': class_record['section'],
            'degree': class_record['degree'],
            'semester': class_record['semester'],
            'studentCount': class_record['student_count'],
            'invitedCount': len(normalized_emails),
        },
    }), 201

@app.route('/api/classes/<class_id>/students', methods=['POST'])
@role_required('teacher')
def add_students_to_class(class_id):
    if db is None:
        return jsonify({"error": "Database not connected"}), 500
    if not ObjectId.is_valid(class_id):
        return jsonify({"error": "Class not found"}), 404

    classes_collection = db['classes']
    class_record = classes_collection.find_one({
        '_id': ObjectId(class_id),
        'teacher_id': request.user_id,
    })
    if not class_record:
        return jsonify({"error": "Class not found"}), 404

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request body"}), 400
    student_emails = data.get('invited_emails', data.get('student_emails'))
    if not isinstance(student_emails, list) or not student_emails or any(
        not isinstance(email, str) or not email.strip()
        for email in student_emails
    ):
        return jsonify({"error": "Select at least one valid student"}), 400

    normalized_emails = list(dict.fromkeys(email.strip().lower() for email in student_emails))
    available_students = {
        student['email'].strip().lower(): (
            student.get('degree') or 'UNSPECIFIED',
            student.get('semester'),
        )
        for student in db['students'].find(
            {'email': {'$type': 'string'}},
            {'_id': 0, 'email': 1, 'degree': 1, 'semester': 1},
        )
    }
    available_students.update({
        student['email'].strip().lower(): (
            student.get('degree') or 'UNSPECIFIED',
            student.get('semester'),
        )
        for student in db['users'].find(
            {'role': 'student', 'email': {'$type': 'string'}},
            {'_id': 0, 'email': 1, 'degree': 1, 'semester': 1},
        )
    })
    if any(email not in available_students for email in normalized_emails):
        return jsonify({"error": "One or more selected students are no longer available"}), 400
    if any(
        available_students[email] != (
            class_record.get('degree') or 'UNSPECIFIED',
            class_record.get('semester'),
        )
        for email in normalized_emails
    ):
        return jsonify({"error": "Students must match this class program and semester"}), 400

    existing_emails = class_record.get('invited_emails', [])
    enrolled_emails = class_record.get('student_emails', [])
    if not isinstance(existing_emails, list):
        existing_emails = []
    if not isinstance(enrolled_emails, list):
        enrolled_emails = []
    existing_normalized = {
        email.strip().lower()
        for email in existing_emails + enrolled_emails
        if isinstance(email, str)
    }
    new_emails = [
        email for email in normalized_emails
        if email not in existing_normalized
    ]
    if new_emails:
        classes_collection.update_one(
            {'_id': ObjectId(class_id), 'teacher_id': request.user_id},
            {'$addToSet': {'invited_emails': {'$each': new_emails}}},
        )
        teacher = db['users'].find_one(
            {'_id': ObjectId(request.user_id)} if ObjectId.is_valid(request.user_id) else {'_id': request.user_id},
            {'name': 1},
        )
        teacher_name = (teacher.get('name') if teacher else None) or 'Your teacher'
        for email in new_emails:
            create_course_invitation_notification(email, class_id, class_record, teacher_name)

    updated_class = classes_collection.find_one(
        {'_id': ObjectId(class_id), 'teacher_id': request.user_id},
        {'student_emails': 1, 'invited_emails': 1},
    )
    if not updated_class:
        return jsonify({"error": "Class not found"}), 404
    return jsonify({
        'message': 'Course registration invitation sent' if new_emails else 'Selected students were already invited',
        'student_emails': updated_class.get('student_emails', []),
        'invited_emails': updated_class.get('invited_emails', []),
        'invited_count': len(new_emails),
    }), 200

@app.route('/api/classes/<class_id>', methods=['DELETE'])
@role_required('teacher')
def delete_class(class_id):
    if db is None:
        return jsonify({"error": "Database not connected"}), 500
    if not ObjectId.is_valid(class_id):
        return jsonify({"error": "Class not found"}), 404

    result = db['classes'].delete_one({
        '_id': ObjectId(class_id),
        'teacher_id': request.user_id,
    })
    if result.deleted_count != 1:
        return jsonify({"error": "Class not found"}), 404

    return jsonify({
        "message": "Class deleted. Existing assignment and submission records were kept.",
    }), 200

@app.route('/api/classes/<class_id>/assignments', methods=['GET'])
@role_required('teacher')
def get_class_assignments(class_id):
    """Get all assignments for a specific class"""
    if db is None:
        return jsonify({"error": "Database not connected"}), 500
    
    # Get class and assignments
    classes_collection = db['classes']
    class_ids = [class_id]
    if ObjectId.is_valid(class_id):
        class_ids.append(ObjectId(class_id))
    if class_id.isdigit():
        class_ids.append(int(class_id))

    cls = classes_collection.find_one({
        '_id': {'$in': class_ids},
        'teacher_id': request.user_id,
    })
    
    if not cls:
        return jsonify({"error": "Class not found"}), 404
    
    assignments_collection = db['assignments']
    assignments = list(assignments_collection.find({'course': class_id}))
    assignments.sort(key=lambda assignment: (
        str(assignment.get('created_at') or ''),
        str(assignment.get('_id') or ''),
    ))
    for index, assignment in enumerate(assignments, start=1):
        assignment['assignment_number'] = assignment.get('assignment_number') or index

    # Convert database fields to the shape expected by the existing class page.
    total_students = (
        len(cls['student_emails'])
        if isinstance(cls.get('student_emails'), list)
        else cls.get('student_count', 0)
    )
    for assignment in assignments:
        assignment['_id'] = str(assignment['_id'])
        assignment['id'] = assignment['_id']
        assignment['createdAt'] = assignment.get('created_at')
        submitted_students = db['submissions'].count_documents({
            'assignment_id': assignment['id'],
        })
        assignment['total_students'] = total_students
        assignment['submitted_students'] = submitted_students
        assignment['pending_students'] = max(total_students - submitted_students, 0)
    
    cls['_id'] = str(cls['_id'])
    
    return jsonify({
        "class": {
            "id": cls.get('_id'),
            "name": cls.get('name'),
            "code": cls.get('code'),
            "section": cls.get('section'),
            "studentCount": total_students,
            "degree": cls.get('degree'),
            "semester": cls.get('semester'),
            "studentEmails": cls.get('student_emails', []),
            "invitedEmails": cls.get('invited_emails', []),
        },
        "assignments": assignments
    }), 200

@app.route('/api/assignments/<assignment_id>/submissions', methods=['GET'])
@role_required('teacher')
def get_assignment_submissions(assignment_id):
    """Get all submissions for a specific assignment"""
    if submission_model is None:
        return jsonify({"error": "Database not connected"}), 500

    if not ObjectId.is_valid(assignment_id):
        return jsonify({"error": "Assignment not found"}), 404
    assignment = db['assignments'].find_one({
        '_id': ObjectId(assignment_id),
        'teacher_id': request.user_id,
    })
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404

    course = str(assignment.get('course', ''))
    course_values = [course]
    if ObjectId.is_valid(course):
        course_values.append(ObjectId(course))
    class_record = db['classes'].find_one({
        'teacher_id': request.user_id,
        '$or': [
            {'_id': {'$in': course_values}},
            {'code': course},
            {'name': course},
        ],
    })
    if not class_record:
        return jsonify({"error": "Assignment class not found"}), 404

    submitted_records = list(db['submissions'].find({
        'assignment_id': assignment_id,
    }))
    submissions_by_email = {
        item.get('studentEmail', '').strip().lower(): item
        for item in submitted_records
    }
    submissions = []
    for email in class_record.get('student_emails', []):
        normalized_email = email.strip().lower()
        record = submissions_by_email.get(normalized_email)
        submissions.append({
            'id': str(record['_id']) if record else normalized_email,
            'name': (record.get('studentName') if record else None) or email,
            'email': email,
            'status': 'submitted' if record else 'pending',
            'submittedAt': (
                record['createdAt'].isoformat()
                if record and hasattr(record.get('createdAt'), 'isoformat')
                else record.get('createdAt') if record else None
            ),
            'score': record.get('score') if record else None,
            'aiLabel': record.get('aiLabel') if record else None,
            'aiPercentage': record.get('aiPercentage') if record else None,
            'humanPercentage': record.get('humanPercentage') if record else None,
            'aiConfidence': record.get('aiConfidence') if record else None,
        })

    return jsonify({
        "assignment": {
            'id': assignment_id,
            'title': assignment.get('title', ''),
            'classId': str(class_record['_id']),
            'className': f"{class_record.get('code', '')} - {class_record.get('section', '')}".strip(' -'),
        },
        "submissions": submissions,
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)), debug=False)
    