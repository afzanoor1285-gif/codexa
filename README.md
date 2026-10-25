# Codexa

Codexa is a React/Vite frontend and Flask/MongoDB backend.

## Deploy the backend

Configure the backend service with `Backend` as its root directory.

- Python runtime: 3.11 (the pinned NumPy and scikit-learn versions need it).
- Install command: `pip install -r requirements.txt`
- Start command: `gunicorn --bind 0.0.0.0:$PORT app:app`
- Copy `Backend/.env.example` variables into the hosting provider's environment settings.
- Set `MONGO_URI` to a reachable MongoDB connection string.
- Set `JWT_SECRET_KEY` to a new, randomly generated secret. Never use the example value in production.
- Configure `EMAIL_ADDRESS`, `EMAIL_PASSWORD`, and `SUPPORT_EMAIL` if email features are needed.

The ML model files are committed under `Backend/Ml/` and are loaded by the backend on startup.

## Deploy the frontend

Configure the frontend service with `Frontend` as its root directory.

- Install command: `npm ci`
- Build command: `npm run build`
- Publish directory: `dist`
- Set `VITE_API_URL` to the deployed backend's public URL, without a trailing slash.

`Frontend/.env.example` shows the required frontend environment variable. Vite embeds this value at build time, so set it before building the frontend.

## Persistent file storage

Profile photos are stored under the backend's `uploads/` directory. On hosting platforms with ephemeral filesystems, configure persistent storage for this directory or replace it with object storage; otherwise uploaded photos may disappear on redeploy.

## Local development

Install frontend dependencies in `Frontend` and run `npm run dev`. Install Python dependencies from `Backend/requirements.txt`, configure `Backend/.env`, and start the Flask app with `python app.py`.
