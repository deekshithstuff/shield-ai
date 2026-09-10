# SHIELD.AI

SHIELD.AI is a defensive cybersecurity platform designed to detect phishing and social-engineering threats in URLs, messages, and QR-code destinations before a user interacts with them.

## Problem Being Solved

Modern phishing attacks often hide behind deceptive links, urgent language, and malicious QR codes. Many users trust what appears to be legitimate before checking whether the destination is safe. SHIELD.AI helps detect risky content locally and presents a clear assessment without opening suspicious destinations automatically.

## Features

- URL risk analysis for suspicious and malicious destinations
- Message and social-engineering analysis for phishing-style alerts
- QR-code upload and decoding workflow
- Local-only safety-first analysis
- Risk score, threat category, explanation, and recommended action
- Clear user-friendly status model: SAFE, SUSPICIOUS, or DANGEROUS

## System Architecture

The project is split into two main layers:

- Frontend: React + Vite dashboard that provides the user experience
- Backend: FastAPI service that performs local analysis and risk scoring

Data flows in a defensive pattern:

1. User submits URL, message, or QR image
2. Backend validates the input and applies rules locally
3. Results are scored and returned as structured analysis output
4. UI displays the risk assessment without navigating to untrusted content

## Technology Stack

- Frontend: React + Vite
- Backend: FastAPI
- Python libraries: OpenCV, qrcode, python-multipart, pydantic-settings, SQLAlchemy
- Local-only security workflow: no automatic website browsing or credential submission

## Project Structure

- frontend/: React dashboard and UI logic
- backend/: FastAPI app, models, and analysis services
- backend/tests/: automated verification for analyzer behavior
- docs/: supporting architecture and security notes
- .env.example: sample environment configuration template
- .gitignore: repository hygiene and secret exclusion rules

## Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd SHIELD.AI
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
```

On Windows PowerShell:

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Running the Frontend

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open the app in the browser:

```text
http://127.0.0.1:5173/
```

## Running the Backend

From the project root:

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --app-dir backend
```

The backend will run on:

```text
http://127.0.0.1:8000
```

## Environment Variables

Copy the example file and customize only the placeholders:

```bash
cp .env.example .env
```

Example values:

```env
APP_ENV=development
SECRET_KEY=replace-with-a-secure-secret-key
DATABASE_URL=sqlite:///./local.db
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Do not commit the real `.env` file.

## Frontend API Configuration

The frontend reads its backend URL from the Vite environment variable `VITE_API_BASE_URL`.

Create a local frontend env file:

```bash
cd frontend
copy .env.example .env
```

Example:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

For deployment, set the Vercel environment variable to the public Render backend URL.

## Deployment Readiness

### Frontend: Vercel

- Framework: React + Vite
- Build command: `npm run build`
- Output directory: `dist`
- Start command for preview: `npm run preview -- --host 0.0.0.0 --port 4173`
- Public URL: Use the Vercel-provided domain or custom domain
- Backend URL: set `VITE_API_BASE_URL` to the Render backend URL

### Backend: Render

- Framework: FastAPI
- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
- Health check endpoint: `/health`
- Environment variables:
  - `APP_ENV=production`
  - `SECRET_KEY=<secure secret>`
  - `DATABASE_URL=sqlite:///./local.db` (placeholder for local-only prototype)
  - `CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app`

## CORS and Remote Frontend Access

The backend currently only allowed localhost origins. That is safe for local development, but it prevents a deployed frontend from making requests.

To support a production deployment, the backend must allow the deployed frontend origin in `CORS_ALLOWED_ORIGINS`.

Example:

```env
CORS_ALLOWED_ORIGINS=https://shield-ai.vercel.app
```

If a Vercel frontend uses more than one domain, list them as comma-separated values.

## Testing Instructions

Run the backend tests:

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m unittest discover -s tests -p "test_qr_analyzer.py"
```

Run the frontend production build:

```powershell
cd frontend
npm run build
```

## Security Considerations

- The platform is defensive by design.
- No suspicious URL is opened automatically.
- No downloaded files are executed.
- Credentials are never submitted to external destinations.
- All content is treated as untrusted input.
- Local environment files and secret values are excluded from version control.

## Future Improvements

- Persistent analysis history in SQLite or another secure local store
- Expanded risk-scoring logic and threat intelligence rules
- OCR and image-based phishing detection improvements
- Better QR quality handling and image preprocessing
- Additional reporting and export features for analysts

## License

This project is intended for defensive cybersecurity learning and research use only.
