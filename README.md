# Codexa

Codexa is a React/Vite frontend and Flask/MongoDB backend.

## Deploy the backend

Configure the backend service with `Backend` as its root directory.

- Python runtime: 3.11 or 3.13.
- Install command: `pip install -r requirements.txt`
- Start command: `gunicorn --bind 0.0.0.0:$PORT app:app`
- Copy `Backend/.env.example` variables into the hosting provider's environment settings.
- Set `MONGO_URI` to a reachable MongoDB connection string.
- Set `JWT_SECRET_KEY` to a new, randomly generated secret. Never use the example value in production.
- Configure `EMAIL_ADDRESS`, `EMAIL_PASSWORD`, and `SUPPORT_EMAIL` if email features are needed.

The active Python AI detector and its feature transformers are committed under `Backend/Ml/models/` and are loaded by the backend on startup. The human and AI training CSV files are included under `Backend/Ml/dataset/`. Reproduce training and its problem-grouped holdout evaluation with `python Ml\train.py` from `Backend`. Training excludes code snippets with conflicting labels and uses grouped cross-validation with the one-standard-error rule to favor stronger regularization without a material validation-score loss. It then evaluates on separate unseen problems and saves one final model and its transformers. Training and validation scores, their generalization gap, and the regularization choice are saved to `Backend/Ml/models/validation_metrics.json`. The confidence shown by the app is a sigmoid-scaled decision-margin estimate, not a calibrated probability.

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

Install Python dependencies from the repository root with `.\.venv\Scripts\python.exe -m pip install -r Backend\requirements.txt`. Start the backend from `Backend` with `..\.venv\Scripts\python.exe app.py`. In a second terminal, run `npm run dev` from `Frontend` and open the local Vite URL. `Frontend` defaults to the local backend at `http://127.0.0.1:5000`.
