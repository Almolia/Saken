# Saken (ساکن) - Building Management System

## Architecture & Tech Stack

- **Architecture:** Headless & Modular Monolith  
- **Backend:** Python / Django / Django REST Framework  
- **Frontend:** React / Vite  
- **AI Tool:** GitHub Copilot  

## Team Members

- Ali Mohammadzade Shabestari (ali.mohammadzade.sh@gmail.com)  
- Ali Hashemian (aho.hashemian@gmail.com)  
- Matin Mahmoudi (matadysa@gmail.com)  
- Mojtaba Faratin (mojtabafaratin1382@gmail.com)  
- Seyed Hossein Seyed Mahdi Jasbi (shjasbi200@gmail.com)  

## Project Structure

```text
Saken/
├── backend/
├── frontend/
└── docs/
```

## Prerequisites

Before running the project, ensure the following are installed on your system:

- Python 3.11+  
- Node.js 20+  
- npm  

## Initial Setup

### 1) Clone the repository

```bash
git clone https://github.com/Almolia/Saken.git
cd Saken
```

---

# Backend Setup

### Windows

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver
```

### Linux / macOS

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```
*(Note for GitHub Codespaces: Run `python manage.py runserver 0.0.0.0:8000` instead)*

---

# Frontend Setup

Open a new terminal window:

### Windows

```cmd
cd frontend
copy .env.example .env
npm install
npm run dev
```

### Linux / macOS

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
*(Note for GitHub Codespaces: Run `npm run dev -- --host 0.0.0.0 --port 5173` instead)*

---

# Environment Configuration

## Frontend

File: `frontend/.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Backend

The `backend/.env` file is configured by default for local development.

**GitHub Codespaces Users:** 
Update the following variables in your `backend/.env` with your public port domain:
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

You must also update `VITE_API_BASE_URL` in `frontend/.env` with your Codespaces public port 8000 URL.

---

# Running the Project

After starting both the backend and frontend, you can access the application at:

- **Backend API:** `http://127.0.0.1:8000`  
- **Frontend App:** `http://localhost:5173`  

### Main Frontend Routes:

- `/login` - User Login
- `/register` - User Registration
- `/setup-manager` - Initial Manager Setup
- `/resident/dashboard` - Resident Dashboard
- `/manager/users` - User Management Dashboard

---

# First-Time Usage

For the very first run:

1. Navigate to `/setup-manager`.  
2. Create the initial system manager account.  
3. Log in via `/login`.  
4. Regular users can now register via `/register`.  

## Optional initial admin

Database migrations never create a default admin. If an admin account is needed,
set all of the following process environment variables (also documented in
`backend/.env.example`) and use a strong, unique password:

```bash
cd backend
export SAKEN_ADMIN_PHONE=0912xxxxxxx
export SAKEN_ADMIN_USERNAME=admin
export SAKEN_ADMIN_FULL_NAME="System Administrator"
export SAKEN_ADMIN_NATIONAL_ID=xxxxxxxxxx
export SAKEN_ADMIN_PASSWORD="replace-with-a-strong-password"
python manage.py seed_admin
```

On PowerShell, use `$env:SAKEN_ADMIN_PHONE = "..."` (and the equivalent for
each remaining variable) before running `python manage.py seed_admin`.

The command is idempotent by phone, so running it again does not create a second
admin. It refuses to run when required credentials are missing, and it will not
promote or overwrite a non-admin account that already uses the configured phone.

---

# Daily Development Workflow

You do not need to recreate the virtual environment or run `npm install` every time.

## Backend

**Windows:**
```cmd
cd backend
.venv\Scripts\activate
python manage.py runserver
```

**Linux / macOS:**
```bash
cd backend
source .venv/bin/activate
python manage.py runserver
```

## Frontend

```bash
cd frontend
npm run dev
```

---

# Tests and CI

Backend tests follow one layout in every Django app:

```text
backend/<app>/tests/__init__.py
backend/<app>/tests/test_*.py
```

Run the complete backend suite in parallel:

**Windows:**
```cmd
cd backend
.venv\Scripts\activate
python manage.py test --parallel
```

**Linux / macOS:**
```bash
cd backend
source .venv/bin/activate
python manage.py test --parallel
```

Run the complete frontend quality gate from a second terminal:

```bash
cd frontend
npm ci
npm run lint
npm test
npm run build
```

The GitHub Actions workflow runs two independent jobs in parallel:

- `Django Tests`: migrations followed by the parallel Django test suite on PostgreSQL.
- `Frontend Tests`: clean npm install, ESLint, Vitest, and the production Vite build.

A failure in either job makes the CI workflow fail. In repository branch protection,
mark both `Django Tests` and `Frontend Tests` as required status checks for `main`
so a backend or frontend failure cannot be merged.

---

# Troubleshooting (GitHub Codespaces)

- Ensure ports `8000` and `5173` are set to **Public** visibility.  
- If you modify environment variables (`.env`), you must fully restart both the backend and frontend servers.  
- If the frontend shows a `Failed to fetch` error:
  1. Verify that `VITE_API_BASE_URL` matches your active backend URL.  
  2. Check your `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` settings in the backend `.env` file.