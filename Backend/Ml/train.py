# pip install scikit-learn pandas numpy joblib
import os
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import pickle

# Base path
base_path = os.path.dirname(__file__)

# Load text files
def load_texts(folder, label):
    texts = []
    labels = []
    for file in os.listdir(folder):
        if file.endswith('.py'):
            path = os.path.join(folder, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    texts.append(content)
                    labels.append(label)
            except Exception as e:
                print(f"Skipping {file}: {e}")
    return texts, labels

# Folders
ai_folder = os.path.join(base_path, 'dataset', 'ai', 'python')
human_folder = os.path.join(base_path, 'dataset', 'human', 'python')

ai_texts, ai_labels = load_texts(ai_folder, 1)
human_texts, human_labels = load_texts(human_folder, 0)

all_texts = ai_texts + human_texts
all_labels = ai_labels + human_labels

# Preprocess
def preprocess(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

processed_texts = [preprocess(text) for text in all_texts]

# TF-IDF
vectorizer = TfidfVectorizer(max_features=5000)
X = vectorizer.fit_transform(processed_texts)
y = all_labels

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train
model = LogisticRegression()
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(f'Accuracy: {accuracy_score(y_test, y_pred)}')
print(f'Precision: {precision_score(y_test, y_pred)}')
print(f'Recall: {recall_score(y_test, y_pred)}')
print(f'F1-Score: {f1_score(y_test, y_pred)}')

# Save
model_dir = os.path.join(base_path, 'model')
os.makedirs(model_dir, exist_ok=True)

with open(os.path.join(model_dir, 'model.pkl'), 'wb') as f:
    pickle.dump(model, f)
with open(os.path.join(model_dir, 'vectorizer.pkl'), 'wb') as f:
    pickle.dump(vectorizer, f)