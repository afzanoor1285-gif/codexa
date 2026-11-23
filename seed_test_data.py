"""
Seed script with correct student_emails field for class enrollment.
"""
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from bson import ObjectId
import datetime
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent / "Backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from Ml.code_detector import analyze_code

client = MongoClient('mongodb://localhost:27017/lms_db')
db = client['lms_db']

def seed():
    db.users.delete_many({"email": {"$in": ["teacher@university.edu", "student@university.edu"]}})
    db.classes.delete_many({"code": "CS101-FALL26"})
    db.assignments.delete_many({"title": "Lab 1: Basic Python Algorithms"})
    db.submissions.delete_many({"student_email": "student@university.edu"})
    
    teacher_id = ObjectId()
    db.users.insert_one({
        "_id": teacher_id,
        "name": "Prof. Alan Turing",
        "email": "teacher@university.edu",
        "password": generate_password_hash("123456"),
        "role": "teacher",
        "degree": "OTHER",
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    })

    student_id = ObjectId()
    db.users.insert_one({
        "_id": student_id,
        "name": "Ada Lovelace",
        "email": "student@university.edu",
        "password": generate_password_hash("123456"),
        "role": "student",
        "degree": "BSCS",
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    })

    class_id = ObjectId()
    db.classes.insert_one({
        "_id": class_id,
        "name": "Introduction to Computer Science",
        "code": "CS101-FALL26",
        "teacher_id": str(teacher_id),
        "teacher_email": "teacher@university.edu",
        "student_emails": ["student@university.edu"],
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    })

    assignment_id = ObjectId()
    db.assignments.insert_one({
        "_id": assignment_id,
        "title": "Lab 1: Basic Python Algorithms",
        "description": "Implement factorial and array search algorithms.",
        "course": str(class_id),
        "class_id": str(class_id),
        "teacher_id": str(teacher_id),
        "due_date": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).strftime("%Y-%m-%d"),
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    })

    # Human submission
    human_code = "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)"
    human_analysis = analyze_code(human_code)
    db.submissions.insert_one({
        "_id": ObjectId(),
        "assignment_id": str(assignment_id),
        "student_id": str(student_id),
        "student_email": "student@university.edu",
        "student_name": "Ada Lovelace",
        "code": human_code,
        "notes": "Here is my recursive factorial lab submission.",
        "aiLabel": human_analysis["aiLabel"],
        "aiConfidence": human_analysis["aiConfidence"],
        "aiPercentage": human_analysis["aiPercentage"],
        "humanPercentage": human_analysis["humanPercentage"],
        "submitted_at": datetime.datetime.now(datetime.timezone.utc),
    })
    print("Database properly seeded with class enrollment!")

if __name__ == "__main__":
    seed()
