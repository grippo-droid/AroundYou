# NearMe Discovery Hub

A hyper-local business discovery platform for urban India — find cafes, salons, clinics, restaurants, and more near you, book appointments, follow businesses, and apply for local jobs.

---

## Features

| Feature | Description |
|---|---|
| **Business Discovery** | Browse businesses by category with geolocation-based distance sorting |
| **OTP + Password Auth** | Dual-mode login — phone/password or SMS OTP (MSG91 / Twilio) |
| **Real-time Messaging** | In-app chat between users and business owners |
| **Appointment Booking** | Slot-based booking with owner availability management |
| **Reviews & Ratings** | Star reviews with live aggregated rating on business profiles |
| **Social Post Feed** | Follow businesses and see their latest updates in a personalised feed |
| **Job Listings** | Businesses post jobs; users apply with a one-tap application form |
| **Role-based Access** | Three roles — `user`, `business`, `admin` — each with scoped permissions |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router v6, Recharts, Leaflet |
| **Backend** | FastAPI, Python 3.11, Uvicorn, Motor (async MongoDB driver), Pydantic v2 |
| **Database** | MongoDB 8.x |
| **Auth** | JWT via HTTP-only cookies, Argon2 password hashing, SMS OTP |
| **Storage** | Cloudinary (image uploads) |

---

## Screenshots

> [Add screenshots here]

---

## Getting Started

You need **three terminal windows** running simultaneously.

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- MongoDB 8.x running locally

### 1 — Start MongoDB

```bash
mongod --dbpath /data/db
```

> First time only — create the data directory: `mkdir -p /data/db` (Linux/Mac) or `New-Item -ItemType Directory -Force C:\data\db` (Windows)

### 2 — Backend (FastAPI)

```bash
cd backend

# First time only — create virtual environment and install dependencies
python -m venv venv
source venv/bin/activate          # Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env

# (Optional) Seed the database with sample data
python seed.py

# Start the server
uvicorn app.main:app --reload
```

Backend runs at **http://localhost:8000**

### 3 — Frontend (React + Vite)

```bash
cd nearme-discovery-hub

# First time only
npm install

# Start dev server
npm run dev
```

Frontend runs at **http://localhost:8080**

Open **http://localhost:8080** in your browser. Register an account at `/register` and choose a role:
- **User** — browse businesses, book appointments, apply for jobs
- **Business** — list and manage your business, post updates, manage bookings

---

## Environment Variables

Create `backend/.env` by copying `.env.example` and filling in your values.

### Required

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string (default: `mongodb://localhost:27017`) |
| `DB_NAME` | Database name (default: `around_you_db`) |
| `JWT_SECRET` | Secret key for signing JWT tokens — use a long random string in production |

### Optional — SMS / OTP

Set `SMS_PROVIDER=console` in development (OTPs print to the server log). Switch to `msg91` or `twilio` in production and fill in the corresponding keys.

| Variable | Description |
|---|---|
| `SMS_PROVIDER` | `console` \| `msg91` \| `twilio` |
| `MSG91_API_KEY` | MSG91 API key (for Indian SMS delivery) |
| `MSG91_TEMPLATE_ID` | Registered DLT template ID |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number |

### Optional — Image Uploads

| Variable | Description |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

The full variable reference is in `backend/.env.example`.

---

## API Documentation

Interactive Swagger docs are available while the backend is running:

```
http://localhost:8000/docs
```

All endpoints, request schemas, and response models are documented there.

---

## Project Structure

```
AroundYou/
├── backend/                        # FastAPI application
│   ├── app/
│   │   ├── config/                 # Database connection & settings
│   │   ├── core/                   # Auth, JWT, security, dependencies
│   │   ├── models/                 # MongoDB document models (Pydantic)
│   │   ├── schemas/                # Request / response schemas
│   │   ├── services/               # Business logic layer
│   │   ├── routes/                 # API route handlers
│   │   └── utils/                  # Helpers (ObjectId, response wrapper)
│   ├── seed.py                     # Database seed script
│   ├── requirements.txt
│   └── .env.example
│
└── nearme-discovery-hub/           # React + Vite frontend
    └── src/
        ├── components/             # Reusable UI components (shadcn + custom)
        ├── context/                # React contexts (Auth, Theme)
        ├── hooks/                  # Custom hooks (geolocation, bookmarks)
        ├── pages/                  # Page-level route components
        ├── services/               # API service functions (api.ts)
        └── types/                  # TypeScript interfaces
```
