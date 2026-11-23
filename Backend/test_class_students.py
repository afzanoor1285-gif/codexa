import sys
import unittest

import pymongo
from bson import ObjectId

from class_roster import class_student_emails


class MemoryCollection:
    def __init__(self, records=None):
        self.records = records or []

    def find_one(self, query, projection=None):
        for record in self.records:
            if "_id" in query and record.get("_id") != query["_id"]:
                continue
            if "teacher_id" in query and record.get("teacher_id") != query["teacher_id"]:
                continue
            return record
        return None

    def find(self, query=None, projection=None):
        records = list(self.records)
        if query and query.get("role"):
            records = [
                record for record in records
                if record.get("role") == query["role"]
            ]
        if query and query.get("email") == {"$type": "string"}:
            records = [
                record for record in records
                if isinstance(record.get("email"), str)
            ]
        return records

    def update_one(self, query, update, upsert=False):
        if "email" in query:
            record = next(
                (item for item in self.records if item.get("email") == query["email"]),
                None,
            )
            if record is None:
                record = {}
                self.records.append(record)
            record.update(update["$set"])
        elif "student_emails" in update.get("$addToSet", {}):
            emails = self.records[0].setdefault("student_emails", [])
            for email in update["$addToSet"]["student_emails"]["$each"]:
                if email not in emails:
                    emails.append(email)
            invited_emails = self.records[0].setdefault("invited_emails", [])
            self.records[0]["invited_emails"] = [
                email for email in invited_emails
                if email not in update.get("$pull", {}).get("invited_emails", {}).get("$in", [])
            ]
        return type("UpdateResult", (), {"matched_count": 1})()

    def insert_one(self, record):
        self.records.append(record)


class MemoryDatabase:
    def __init__(self):
        self.collections = {}

    def command(self, name):
        return {"ok": 1}

    def __getitem__(self, name):
        return self.collections.setdefault(name, MemoryCollection())


class MemoryMongoClient:
    def __init__(self, *args, **kwargs):
        self.database = MemoryDatabase()

    def __getitem__(self, name):
        return self.database


def load_flask_app():
    if "app" in sys.modules:
        return sys.modules["app"]
    original_client = pymongo.MongoClient
    pymongo.MongoClient = MemoryMongoClient
    try:
        import app
        return app
    finally:
        pymongo.MongoClient = original_client


class AddStudentToClassTests(unittest.TestCase):
    def setUp(self):
        self.backend = load_flask_app()
        import routes.auth as auth
        from config import Config
        import jwt

        self.auth = auth
        self.original_db = self.backend.db
        self.original_user_lookup = auth.user_model.find_by_email
        self.class_id = ObjectId()
        self.class_record = {
            "_id": self.class_id,
            "teacher_id": "teacher-id",
            "degree": "BSCS",
            "semester": 2,
            "student_emails": [],
            "invited_emails": [],
        }
        self.database = MemoryDatabase()
        self.database.collections["classes"] = MemoryCollection([self.class_record])
        self.database.collections["users"] = MemoryCollection([
            {"_id": "teacher-id", "name": "Teacher"},
        ])
        self.backend.db = self.database
        auth.user_model.find_by_email = lambda email: {
            "_id": "teacher-id",
            "email": "teacher@example.com",
            "role": "teacher",
        }
        self.token = jwt.encode(
            {
                "user_id": "teacher-id",
                "email": "teacher@example.com",
                "role": "teacher",
            },
            Config.JWT_SECRET_KEY,
            algorithm="HS256",
        )

    def tearDown(self):
        self.backend.db = self.original_db
        self.auth.user_model.find_by_email = self.original_user_lookup

    def test_manual_student_is_saved_and_added_to_the_class(self):
        response = self.backend.app.test_client().post(
            f"/api/classes/{self.class_id}/students",
            json={
                "student": {
                    "name": "New Student",
                    "email": "new.student@example.com",
                },
            },
            headers={"Authorization": f"Bearer {self.token}"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json()["student_emails"],
            ["new.student@example.com"],
        )
        self.assertEqual(response.get_json()["class_student_count"], 1)
        self.assertEqual(response.get_json()["added_count"], 1)
        self.assertEqual(
            self.database["students"].records[0],
            {
                "name": "New Student",
                "email": "new.student@example.com",
                "degree": "BSCS",
                "semester": 2,
            },
        )
        self.assertEqual(
            class_student_emails(self.class_record),
            ["new.student@example.com"],
        )

    def test_rejects_invalid_student_email_without_saving(self):
        response = self.backend.app.test_client().post(
            f"/api/classes/{self.class_id}/students",
            json={"student": {"name": "New Student", "email": "not-an-email"}},
            headers={"Authorization": f"Bearer {self.token}"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.database["students"].records, [])


if __name__ == "__main__":
    unittest.main()
