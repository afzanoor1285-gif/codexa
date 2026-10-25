from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
from pymongo import MongoClient
from models.user import User
from services.mail_service import send_welcome_email, send_login_notification_email, send_support_message
from functools import wraps
import jwt
import datetime
import re
from config import Config
from werkzeug.security import generate_password_hash

auth_bp = Blueprint('auth', __name__)

client = MongoClient(Config.MONGO_URI)
db = client['lms_db']
user_model = User(db)

STUDENT_DEGREES = {
    'BSCS',
    'BSAI',
    'BSSE',
    'BSIT',
    'BSDS',
    'BSCY',
    'BSCE',
    'BEE',
    'BSEE',
    'BSTE',
    'BSCSE',
    'OTHER',
}
EMAIL_PATTERN = re.compile(r'[^\s@]+@[^\s@]+\.[^\s@]+')
MAX_PROFILE_PICTURE_BYTES = 2 * 1024 * 1024
DEFAULT_SETTINGS = {
    'appearance': {
        'theme': 'system',
        'compact_layout': False,
        'reduced_motion': False,
        'font_size': 'default',
    },
    'notifications': {
        'assignment_deadline_reminders': False,
        'submission_confirmation': False,
        'code_analysis_completed': False,
        'teacher_feedback': False,
        'grades_published': False,
        'submission_received': False,
        'email_notifications': False,
    },
    'analysis': {
        'language': 'python',
        'file_type': '.py',
        'show_model_confidence': True,
        'report_format': 'text',
    },
    'assignment': {
        'default_sort': 'newest',
        'deadline_display': 'date_time',
        'submission_notifications': True,
    },
    'grading': {
        'report_format': 'text',
        'results_sort': 'student_name',
        'visible_columns': ['student', 'status', 'ai_result'],
        'show_confidence': True,
    },
}


def _create_jwt_token(user):
    payload = {
        'user_id': str(user['_id']),
        'email': user['email'],
        'role': user['role'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')


def _format_user(user):
    return {
        'email': user.get('email'),
        'role': user.get('role'),
        'name': user.get('name'),
        'degree': user.get('degree'),
        'bio': user.get('bio', ''),
        'theme': user.get('theme', 'system'),
        'student_id': user.get('student_id'),
        'department': user.get('department') or user.get('degree'),
        'designation': user.get('designation'),
        'semester': user.get('semester'),
        'settings': user.get('settings', DEFAULT_SETTINGS),
    }


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        authorization = request.headers.get('Authorization', '')
        scheme, separator, token = authorization.partition(' ')
        if scheme.lower() != 'bearer' or not separator or not token:
            return jsonify({'error': 'Token is missing or invalid'}), 401

        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401

        user = user_model.find_by_email(payload.get('email', ''))
        if not user or str(user.get('_id')) != payload.get('user_id'):
            return jsonify({'error': 'Token is invalid'}), 401

        request.user_id = str(user['_id'])
        request.user_role = user.get('role')
        request.current_user = user
        return f(*args, **kwargs)

    return decorated


def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated(*args, **kwargs):
            if request.user_role not in allowed_roles:
                return jsonify({'error': 'Unauthorized'}), 403
            return f(*args, **kwargs)

        return decorated

    return decorator


def _profile_picture_mime(contents):
    if contents.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    if contents.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    if contents.startswith((b'GIF87a', b'GIF89a')):
        return 'image/gif'
    if len(contents) >= 12 and contents[:4] == b'RIFF' and contents[8:12] == b'WEBP':
        return 'image/webp'
    return None


@auth_bp.route('/auth/me', methods=['GET'])
@token_required
def current_user():
    return jsonify({'user': _format_user(request.current_user)}), 200


@auth_bp.route('/api/profile/photo', methods=['GET'])
@role_required('teacher', 'student')
def get_profile_photo():
    user = user_model.collection.find_one(
        {'_id': request.current_user['_id']},
        {'profile_picture': 1, 'profile_picture_mime': 1},
    )
    if not user:
        return jsonify({'error': 'User not found'}), 404
    photo = user.get('profile_picture')
    mime_type = user.get('profile_picture_mime')
    if not photo or not mime_type:
        return jsonify({'error': 'Profile picture not found'}), 404
    return send_file(
        BytesIO(bytes(photo)),
        mimetype=mime_type,
        max_age=0,
        download_name='profile-picture',
    )


@auth_bp.route('/api/profile', methods=['PUT'])
@role_required('teacher', 'student')
def update_profile():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid request body'}), 400

    name = data.get('name')
    bio = data.get('bio', '')
    theme = data.get('theme', 'system')
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 80:
        return jsonify({'error': 'Name is required and must be 80 characters or fewer'}), 400
    if not isinstance(bio, str) or len(bio.strip()) > 300:
        return jsonify({'error': 'Bio must be 300 characters or fewer'}), 400
    if theme not in ('light', 'dark', 'system'):
        return jsonify({'error': 'Theme must be light, dark, or system'}), 400

    update_fields = {'name': name.strip(), 'bio': bio.strip(), 'theme': theme}
    if request.user_role == 'teacher':
        department = data.get('department', request.current_user.get('department', ''))
        designation = data.get('designation', request.current_user.get('designation', ''))
        if (
            not isinstance(department, str) or len(department.strip()) > 100
            or not isinstance(designation, str) or len(designation.strip()) > 100
        ):
            return jsonify({'error': 'Department and designation must be 100 characters or fewer'}), 400
        update_fields['department'] = department.strip()
        update_fields['designation'] = designation.strip()
    result = user_model.collection.update_one(
        {'_id': request.current_user['_id']},
        {'$set': update_fields},
    )
    if result.matched_count != 1:
        return jsonify({'error': 'Unable to update profile'}), 500

    updated_user = user_model.find_by_email(request.current_user['email'])
    return jsonify({'message': 'Profile updated', 'user': _format_user(updated_user)}), 200


@auth_bp.route('/api/settings', methods=['GET'])
@role_required('teacher', 'student')
def get_settings():
    settings = request.current_user.get('settings', {})
    merged_settings = {
        section: {**defaults, **settings.get(section, {})}
        for section, defaults in DEFAULT_SETTINGS.items()
    }
    merged_settings['appearance']['theme'] = request.current_user.get(
        'theme',
        merged_settings['appearance']['theme'],
    )
    if request.user_role != 'teacher':
        merged_settings.pop('assignment', None)
        merged_settings.pop('grading', None)
    return jsonify({
        'settings': merged_settings,
        'user': _format_user(request.current_user),
        'email_notifications_available': bool(Config.EMAIL_ADDRESS and Config.EMAIL_PASSWORD),
        'deadline_reminders_available': False,
        'pdf_reports_available': False,
        'support_available': bool(Config.SUPPORT_EMAIL and Config.EMAIL_ADDRESS and Config.EMAIL_PASSWORD),
        'deletion_request_pending': bool(request.current_user.get('deletion_request', {}).get('status') == 'pending'),
    }), 200


@auth_bp.route('/api/support/feedback', methods=['POST'])
@role_required('teacher', 'student')
def submit_support_feedback():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid request body'}), 400
    category = data.get('category')
    message = data.get('message')
    if category not in ('problem', 'feedback'):
        return jsonify({'error': 'Choose problem or feedback'}), 400
    if not isinstance(message, str) or not message.strip() or len(message.strip()) > 3000:
        return jsonify({'error': 'Message is required and must be 3000 characters or fewer'}), 400
    if not Config.SUPPORT_EMAIL:
        return jsonify({'error': 'Support email is not configured'}), 503
    if not send_support_message(request.current_user, category, message.strip(), Config.SUPPORT_EMAIL):
        return jsonify({'error': 'Support email could not be sent. Please try again later.'}), 502
    return jsonify({'message': 'Your message was sent to Codexa support'}), 200


@auth_bp.route('/api/account/deletion-request', methods=['POST'])
@role_required('teacher', 'student')
def request_account_deletion():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or data.get('confirm') is not True:
        return jsonify({'error': 'Explicit confirmation is required'}), 400
    if request.current_user.get('deletion_request', {}).get('status') == 'pending':
        return jsonify({'error': 'A deletion request is already pending'}), 409
    result = user_model.collection.update_one(
        {'_id': request.current_user['_id']},
        {'$set': {
            'deletion_request': {
                'status': 'pending',
                'requested_at': datetime.datetime.utcnow(),
            },
        }},
    )
    if result.matched_count != 1:
        return jsonify({'error': 'Unable to record deletion request'}), 500
    return jsonify({'message': 'Deletion request recorded for administrator review'}), 202


@auth_bp.route('/api/settings', methods=['PUT'])
@role_required('teacher', 'student')
def save_settings():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get('settings'), dict):
        return jsonify({'error': 'Settings are required'}), 400

    incoming = data['settings']
    if request.user_role != 'teacher' and any(
        section in incoming for section in ('assignment', 'grading')
    ):
        return jsonify({'error': 'Teacher preferences are not available to student accounts'}), 403
    current = request.current_user.get('settings', {})
    updated = {
        section: {**defaults, **current.get(section, {})}
        for section, defaults in DEFAULT_SETTINGS.items()
    }
    for section, values in incoming.items():
        if section not in updated or not isinstance(values, dict):
            return jsonify({'error': 'Unknown settings section'}), 400
        unknown = set(values) - set(updated[section])
        if unknown:
            return jsonify({'error': 'Unknown preference in ' + section}), 400
        updated[section].update(values)

    appearance = updated['appearance']
    if (
        appearance['theme'] not in ('light', 'dark', 'system')
        or not isinstance(appearance['compact_layout'], bool)
        or not isinstance(appearance['reduced_motion'], bool)
        or appearance['font_size'] not in ('small', 'default', 'large')
    ):
        return jsonify({'error': 'Invalid appearance preferences'}), 400

    notifications = updated['notifications']
    if any(not isinstance(value, bool) for value in notifications.values()):
        return jsonify({'error': 'Notification preferences must be enabled or disabled'}), 400
    if notifications['assignment_deadline_reminders']:
        return jsonify({'error': 'Scheduled deadline reminders are not available in this deployment'}), 400

    analysis = updated['analysis']
    if (
        analysis['language'] not in ('python', 'javascript', 'java', 'cpp', 'other')
        or analysis['file_type'] not in ('.py', '.js', '.java', '.cpp', '.txt')
        or not isinstance(analysis['show_model_confidence'], bool)
        or analysis['report_format'] != 'text'
    ):
        return jsonify({'error': 'Invalid code analysis preferences'}), 400

    if request.user_role == 'teacher':
        assignment = updated['assignment']
        grading = updated['grading']
        if (
            assignment['default_sort'] not in ('newest', 'oldest', 'deadline')
            or assignment['deadline_display'] not in ('date_time', 'date_only', 'relative')
            or not isinstance(assignment['submission_notifications'], bool)
            or grading['report_format'] != 'text'
            or grading['results_sort'] not in ('student_name', 'submission_time', 'score', 'ai_result')
            or not isinstance(grading['visible_columns'], list)
            or any(column not in ('student', 'status', 'ai_result', 'confidence', 'score', 'submission_time')
                   for column in grading['visible_columns'])
            or 'student' not in grading['visible_columns']
            or not isinstance(grading['show_confidence'], bool)
        ):
            return jsonify({'error': 'Invalid teacher assignment or grading preferences'}), 400
    else:
        updated.pop('assignment', None)
        updated.pop('grading', None)

    result = user_model.collection.update_one(
        {'_id': request.current_user['_id']},
        {'$set': {'settings': updated, 'theme': appearance['theme']}},
    )
    if result.matched_count != 1:
        return jsonify({'error': 'Unable to save settings'}), 500

    updated_user = user_model.find_by_email(request.current_user['email'])
    return jsonify({
        'message': 'Settings saved',
        'settings': updated,
        'user': _format_user(updated_user),
    }), 200


@auth_bp.route('/api/security/password', methods=['POST'])
@role_required('teacher', 'student')
def change_password():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid request body'}), 400
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    if not isinstance(current_password, str) or not isinstance(new_password, str):
        return jsonify({'error': 'Current and new passwords are required'}), 400
    if not re.fullmatch(r'[0-9]{6}', new_password):
        return jsonify({'error': 'New password must contain exactly six numeric digits'}), 400
    if current_password == new_password:
        return jsonify({'error': 'New password must be different from the current password'}), 400
    user = user_model.verify_password(request.current_user['email'], current_password)
    if not user or str(user['_id']) != request.user_id:
        return jsonify({'error': 'Current password is incorrect'}), 403

    result = user_model.collection.update_one(
        {'_id': user['_id']},
        {'$set': {'password': generate_password_hash(new_password)}},
    )
    if result.matched_count != 1:
        return jsonify({'error': 'Unable to update password'}), 500
    return jsonify({'message': 'Password updated'}), 200


@auth_bp.route('/api/profile/photo', methods=['POST'])
@role_required('teacher', 'student')
def upload_profile_photo():
    if request.content_length and request.content_length > MAX_PROFILE_PICTURE_BYTES + 64 * 1024:
        return jsonify({'error': 'Profile picture must be 2 MB or smaller'}), 413
    image = request.files.get('photo')
    if image is None:
        return jsonify({'error': 'Choose an image to upload'}), 400

    contents = image.stream.read(MAX_PROFILE_PICTURE_BYTES + 1)
    if not contents:
        return jsonify({'error': 'The selected image is empty'}), 400
    if len(contents) > MAX_PROFILE_PICTURE_BYTES:
        return jsonify({'error': 'Profile picture must be 2 MB or smaller'}), 413

    mime_type = _profile_picture_mime(contents)
    if not mime_type:
        return jsonify({'error': 'Use a JPEG, PNG, GIF, or WebP image'}), 400

    result = user_model.collection.update_one(
        {'_id': request.current_user['_id']},
        {'$set': {
            'profile_picture': contents,
            'profile_picture_mime': mime_type,
        }},
    )
    if result.matched_count != 1:
        return jsonify({'error': 'Unable to save profile picture'}), 500
    return jsonify({'message': 'Profile picture updated'}), 200


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student')
    name = data.get('name')
    degree = data.get('degree')

    if not isinstance(email, str) or not email.strip():
        return jsonify({'error': 'Email is required'}), 400

    email = email.strip().lower()
    if not EMAIL_PATTERN.fullmatch(email):
        return jsonify({'error': 'Please enter a valid email address'}), 400

    if not isinstance(password, str) or not password:
        return jsonify({'error': 'Password is required'}), 400

    if not re.fullmatch(r'[0-9]{6}', password):
        return jsonify({'error': 'Password must contain exactly six numeric digits'}), 400

    if role not in ('teacher', 'student'):
        return jsonify({'error': 'Role must be teacher or student'}), 400

    if role == 'student':
        if not isinstance(name, str) or not name.strip():
            return jsonify({'error': 'Full name is required'}), 400
        if degree is not None and (
            not isinstance(degree, str) or degree not in STUDENT_DEGREES
        ):
            return jsonify({'error': 'Please select a valid degree / department'}), 400
        name = name.strip()

    if user_model.find_by_email(email):
        return jsonify({'error': 'Email already registered'}), 400

    user_model.create_user(email, password, role, name, degree=degree if role == 'student' else None)
    user = user_model.find_by_email(email)
    token = _create_jwt_token(user)

    # Send welcome email (fail silently on error)
    user_name = name or email.split('@')[0]
    send_welcome_email(email, user_name, role)

    return jsonify({'token': token, 'user': _format_user(user)}), 201


@auth_bp.route('/register', methods=['POST'])
def register():
    return signup()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}
    email = data.get('email')
    password = data.get('password')
    expected_role = data.get('role')

    if not isinstance(email, str) or not email or not isinstance(password, str) or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    email = email.strip().lower()

    if not re.fullmatch(r'[0-9]{6}', password):
        return jsonify({'error': 'Password must contain exactly six numeric digits'}), 400

    if expected_role not in ('teacher', 'student'):
        return jsonify({'error': 'Role must be teacher or student'}), 400

    user = user_model.verify_password(email, password)
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401

    actual_role = user.get('role')
    if actual_role != expected_role:
        if actual_role == 'teacher':
            return jsonify({
                'error': 'This account is registered as a Teacher. Please use the Teacher Login page.'
            }), 403
        if actual_role == 'student':
            return jsonify({
                'error': 'This account is registered as a Student. Please use the Student Login page.'
            }), 403
        return jsonify({'error': 'This account cannot use the Teacher or Student portal'}), 403

    token = _create_jwt_token(user)
    
    # Send login notification email (fail silently on error)
    user_name = user.get('name') or user.get('email', '').split('@')[0]
    send_login_notification_email(user['email'], user_name)

    return jsonify({'token': token, 'user': _format_user(user)}), 200
