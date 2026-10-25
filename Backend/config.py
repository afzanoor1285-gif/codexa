import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv('MONGO_URI', os.getenv('MONGODB_URI', 'mongodb://localhost:27017/codexa'))
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'py', 'js', 'java', 'cpp', 'txt'}
    EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS', '')
    EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', '')
    SUPPORT_EMAIL = os.getenv('SUPPORT_EMAIL', '')
