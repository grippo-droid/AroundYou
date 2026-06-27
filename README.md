# NearMe Discovery Hub

A full-stack hyper-local business discovery platform built with **React + Vite** (frontend) and **FastAPI + MongoDB** (backend).

---

## How to Start the Project

You need **3 PowerShell windows** open at the same time — one each for MongoDB, the backend, and the frontend. Follow the steps below in order.

---

### Window 1 — MongoDB

> Do this **once ever** (creates the data folder):
```powershell
New-Item -ItemType Directory -Force -Path "C:\data\db"
```

> Do this **every time** you want to run the project:
```powershell
& "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "C:\data\db"
```

Leave this window open. You should see `Waiting for connections` in the output — that means MongoDB is running.

---

### Window 2 — Backend (FastAPI)

Open a **new** PowerShell window.

> Do this **once ever** (sets up the Python environment):
```powershell
Set-Location "E:\LETS COOK\Projects\Around_You\backend"
& ".\venv\Scripts\python.exe" -m pip install -r requirements.txt --prefer-binary
```

> Do this **every time** you want to run the project:
```powershell
Set-Location "E:\LETS COOK\Projects\Around_You\backend"
& ".\venv\Scripts\uvicorn.exe" app.main:app --reload
```

Leave this window open. You should see `Application startup complete.` — that means the backend is running at **http://localhost:8000**.

---

### Window 3 — Frontend (React + Vite)

Open a **new** PowerShell window.

> Do this **once ever** (installs Node packages):
```powershell
Set-Location "E:\LETS COOK\Projects\Around_You\nearme-discovery-hub"
npm install
```

> Do this **every time** you want to run the project:
```powershell
Set-Location "E:\LETS COOK\Projects\Around_You\nearme-discovery-hub"
npm run dev
```

Leave this window open. You should see `Local: http://localhost:8080/` — open that URL in your browser.

---

### All 3 "every time" commands at a glance

| Window | Command |
|--------|---------|
| 1 — MongoDB | `& "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "C:\data\db"` |
| 2 — Backend | `Set-Location "E:\LETS COOK\Projects\Around_You\backend"` → `& ".\venv\Scripts\uvicorn.exe" app.main:app --reload` |
| 3 — Frontend | `Set-Location "E:\LETS COOK\Projects\Around_You\nearme-discovery-hub"` → `npm run dev` |

Open **http://localhost:8080** in your browser once all 3 are running.

---

## Project Structure

```
Around_You/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── config/           # DB connection & settings
│   │   ├── core/             # Auth, security, dependencies
│   │   ├── models/           # MongoDB document models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic
│   │   ├── routes/           # API endpoints
│   │   └── utils/            # Helper functions
│   ├── venv/                 # Python virtual environment (Windows CPython 3.11)
│   ├── requirements.txt
│   └── .env                  # Environment variables (already configured)
│
└── nearme-discovery-hub/     # React + Vite frontend
    ├── src/
    │   ├── components/       # Reusable UI components
    │   ├── pages/            # Page-level components
    │   ├── services/         # API service functions
    │   ├── context/          # React contexts (Auth, Theme)
    │   └── types/            # TypeScript interfaces
    └── package.json
```

---

## Environment Variables

Already configured at `backend/.env` — no changes needed for local development:

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=around_you_db
JWT_SECRET=CHANGE_THIS_TO_A_SUPER_SECRET_KEY_IN_PRODUCTION
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
COOKIE_NAME=access_token
COOKIE_SECURE=True
DOMAIN=localhost
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:8080","http://localhost:5173"]
```

---

## Recreating the Virtual Environment

Only needed if the `backend/venv/` folder is missing or corrupted:

```powershell
Set-Location "E:\LETS COOK\Projects\Around_You\backend"
& "C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe" -m venv venv
& ".\venv\Scripts\python.exe" -m pip install -r requirements.txt --prefer-binary
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router v6, Leaflet, TanStack Query |
| Backend | FastAPI, Python 3.11, Uvicorn (port 8000) |
| Database | MongoDB 8.2 (port 27017), Motor (async driver) |
| Auth | JWT via HTTP-only cookies, Argon2 password hashing |

---

## First Time Using the App

Once all 3 windows are running, go to **http://localhost:8080/register** and create an account.
Pick role **"Business Owner"** if you want to list businesses, or **"User"** if you just want to explore.
After registering, go to **/login** and sign in — you'll need an account to access the dashboard, messages, and profile pages.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `mongod` not recognized | Use the full path: `& "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "C:\data\db"` |
| `NonExistentPath: Data directory not found` | Run `New-Item -ItemType Directory -Force -Path "C:\data\db"` first |
| `No module named 'fastapi'` | Run the pip install step in Window 2 |
| Backend crashes on startup | Make sure MongoDB (Window 1) is running first |
| Port 8000 already in use | Run `netstat -ano \| findstr :8000`, find the PID, then `Stop-Process -Id <PID> -Force` |
| Port 8080 already in use | Run `netstat -ano \| findstr :8080`, find the PID, then `Stop-Process -Id <PID> -Force` |
| CORS errors in browser | Backend must be running on port **8000** before opening the frontend |
| `npm run dev` fails | Run `npm install` first in Window 3 |
| Login not working | All 3 windows must be running — MongoDB, backend, and frontend |
| Map not loading | Hard refresh with **Ctrl + Shift + R** |
| `venv_msys2_backup/` folder exists | Safe to ignore — it's a backup of an old broken environment, not needed |
