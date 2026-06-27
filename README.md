# Saken (ساکن) - Building Management System

## Architecture & Tech Stack
* **Architecture:** Headless & Modular Monolith
* **Backend:** Python / Django / Django REST Framework
* **Frontend:** React.js / Vite
* **AI Tool:** GitHub Copilot

## Team Members
* Ali Mohammadzade Shabestari (ali.mohammadzade.sh@gmail.com)
* Ali Hashemian (aho.hashemian@gmail.com)
* Matin Mahmoudi (matadysa@gmail.com)
* Mojtaba Faratin (mojtabafaratin1382@gmail.com)
* Seyed Hossein Seyed Mehdi Jasbi (shjasbi200@gmail.com)

## How to Setup & Run (For Team Members)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR-USERNAME/Saken.git
cd Saken
```
*(Note: Replace the URL with the actual repository URL)*

### 2. Backend Setup (Django)
**For Windows:**
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

**For GitHub Codespaces / Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```

### 3. Frontend Setup (React)
**For All OS (Windows / Codespaces):**
Open a **new terminal tab**, then run:
```bash
cd frontend
npm install
npm run dev

