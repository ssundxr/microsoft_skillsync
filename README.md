# Skill Sync (Unified Recruitment Platform)

Skill Sync is a modern, unified recruitment platform built to streamline the candidate experience and recruiter operations. It provides a comprehensive dashboard for creating job postings, an intuitive portal for candidates to apply and track applications, and an AI-powered CV Analyzer.

## Key Features

- **Recruiter Portal**: Post strategic jobs, track active requisitions, and manage applications via a professional UI.
- **Candidate Portal**: Candidates can log in (Email/OTP or Google OAuth) to view applications and browse recommended jobs.
- **CV Intelligence Engine**: Candidates can upload their CV to get AI-powered insights, capability mapping, and course recommendations powered by Gemini AI.
- **Google OAuth Integration**: Candidates can seamlessly sign up and log in using their Google accounts.
- **Modern Tech Stack**: React/Vite frontend with a robust FastAPI backend backed by Supabase PostgreSQL.

## Architecture & Tech Stack

### Frontend
- **Framework**: React.js with Vite
- **Styling**: Custom modern CSS (Vanilla)
- **Auth**: `@react-oauth/google` for Google Sign-In
- **Routing**: `react-router-dom`

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (via Supabase) with SQLAlchemy ORM
- **AI Integration**: Google GenAI (`google-genai`)
- **Authentication**: JWT-based session handling

## Run Locally

### 1. Backend Setup (FastAPI)
Navigate to the root directory and create a virtual environment:
```bash
python -m venv venv
# On Windows
.\venv\Scripts\activate
# On MacOS/Linux
source venv/bin/activate
```
Install the dependencies:
```bash
pip install -r requirements.txt
```
Copy `.env.example` to `.env` and fill in your credentials:
- `SUPABASE_URL` and `DATABASE_URL`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID`

Start the FastAPI server (it runs on port 8000 by default):
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup (React/Vite)
Navigate to the `frontend/` directory:
```bash
cd frontend
npm install
```
Start the Vite development server (it runs on port 5173 by default):
```bash
npm run dev
```

### 3. Access the Portals
- **Recruiter Portal (Admin)**: `http://localhost:5173/admin/login`
- **Candidate Portal**: `http://localhost:5173/candidate/login`

## Default Admin Credentials
For testing the Recruiter Portal locally:
- **Username**: `admin`
- **Password**: `Admin@123`
*(Can be overridden in `.env` via `ADMIN_USERNAME` and `ADMIN_PASSWORD`)*

## Tests
To run backend unit and integration tests:
```bash
pytest
```
