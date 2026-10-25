from typing import Optional
import re

from pymongo.collection import Collection
from werkzeug.security import generate_password_hash, check_password_hash


class User:
    def __init__(self, db: Collection):
        self.collection = db['users']

    def create_user(
        self,
        email: str,
        password: str,
        role: str,
        name: Optional[str] = None,
        student_id: Optional[str] = None,
        degree: Optional[str] = None,
    ):
        if role not in ['student', 'teacher', 'admin']:
            raise ValueError("Invalid role")
        hashed_password = generate_password_hash(password)
        user_doc = {
            'email': email,
            'password': hashed_password,
            'role': role,
            'name': name,
            'student_id': student_id
        }
        if degree is not None:
            user_doc['degree'] = degree
        result = self.collection.insert_one(user_doc)
        return str(result.inserted_id)

    def find_by_email(self, email: str):
        return self.collection.find_one({
            'email': {
                '$regex': f'^{re.escape(email.strip())}$',
                '$options': 'i',
            }
        }, {'profile_picture': 0, 'profile_picture_mime': 0})

    def verify_password(self, email: str, password: str):
        user = self.find_by_email(email)
        if user and check_password_hash(user['password'], password):
            return user
        return None