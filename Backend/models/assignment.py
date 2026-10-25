from pymongo.collection import Collection
from datetime import datetime
from bson import ObjectId

class Assignment:
    def __init__(self, db: Collection):
        self.collection = db['assignments']

    def create_assignment(self, title: str, description: str, course: str, teacher_id: str, deadline: str):
        assignment_doc = {
            'title': title,
            'description': description,
            'course': course,
            'teacher_id': teacher_id,
            'deadline': deadline,
            'created_at': datetime.utcnow()
        }
        result = self.collection.insert_one(assignment_doc)
        return str(result.inserted_id)

    def get_assignments_by_teacher(self, teacher_id: str):
        return list(self.collection.find({'teacher_id': teacher_id}))

    def get_all_assignments(self):
        return list(self.collection.find({}))

    def get_assignment_by_id(self, assignment_id: str):
        return self.collection.find_one({'_id': ObjectId(assignment_id)})