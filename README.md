# NearMe Discovery Hub

> **Note:** The backend is hosted on Render's free tier, which spins down after periods of inactivity. The first request may take 30–60 seconds while the server wakes up. Subsequent requests will be fast.

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

You need **three PowerShell terminals** running simultaneously.

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- MongoDB 8.x running locally (or a MongoDB Atlas cluster — required if you want to develop/test semantic search, see [Semantic Search Setup](#semantic-search-setup-optional))

### 1 — Start MongoDB

```powershell
mongod --dbpath C:\data\db
```

> First time only — create the data directory:
> ```powershell
> New-Item -ItemType Directory -Force C:\data\db
> ```
> If MongoDB is already running (lock file error), skip this step.

### 2 — Backend (FastAPI)

```powershell
cd "E:\LETS COOK\Projects\Around_You\backend"
```

First time only — create virtual environment and install dependencies:

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Copy and fill in environment variables:

```powershell
Copy-Item .env.example .env
```

Seed the database with sample data (Pune + Bhopal businesses):

```powershell
.\venv\Scripts\python.exe seed.py
```

Start the server:

```powershell
.\venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**

### 3 — Frontend (React + Vite)

```powershell
cd "E:\LETS COOK\Projects\Around_You\nearme-discovery-hub"
```

First time only:

```powershell
npm install
```

Start dev server:

```powershell
npm run dev
```

Frontend runs at **http://localhost:8080**

Open **http://localhost:8080** in your browser. Register an account at `/register` and choose a role:
- **User** — browse businesses, book appointments, apply for jobs
- **Business** — list and manage your business, post updates, manage bookings

### Demo Credentials (after running seed.py)

| Role | Phone | Password |
|---|---|---|
| User (Bhopal) | `+919876543210` | `password123` |
| User (Pune) | `+919543210987` | `password123` |
| Business Owner (Bhopal) | `+919654321098` | `business123` |
| Business Owner (Pune) | `+918765432109` | `business456` |
| **Admin** | `+910000000000` | `admin123` |

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

## Semantic Search Setup (Optional)

Natural-language business search (`GET /businesses/search/semantic`) uses MongoDB **Atlas Vector Search**, which is an Atlas-exclusive feature — it does not exist on self-hosted/local MongoDB, even Enterprise. Everything else in this project (including the rest of business search) works fine on plain local MongoDB; this section only matters if you want to develop or test semantic search itself.

### 1 — Point `MONGO_URI` at an Atlas cluster

You already have a production Atlas cluster. The simplest option is to reuse it with a **separate database** for local dev, rather than creating a new cluster:

```
MONGO_URI=mongodb+srv://<same user>:<same password>@<same cluster host>/around_you_dev_db
DB_NAME=around_you_dev_db
```

This costs nothing extra and keeps dev data fully isolated from `around_you_db` (prod) — Atlas Vector Search indexes are created per-database, so a separate database gets its own index with zero conflict.

If you'd rather have a fully separate cluster (e.g. to avoid any shared resource limits with prod):
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Create a new cluster** → select the **M0 Free** tier (no card required beyond initial account setup).
2. Under **Database Access**, create a user with a password.
3. Under **Network Access**, add your current IP (or `0.0.0.0/0` for simplicity in local dev only — never do this for prod).
4. Copy the connection string from **Connect → Drivers**, and use it as `MONGO_URI` above.

### 2 — Create the Vector Search index

One-time, per database (once for your Atlas dev database, once for prod when you're ready):

```powershell
cd backend
$env:MONGO_URI = "<your Atlas connection string>"
$env:DB_NAME = "around_you_dev_db"
.\venv\Scripts\python.exe scripts\create_vector_search_index.py
```

Index creation is asynchronous on Atlas's side — it can take a few seconds to a couple of minutes to finish building. Re-run the script to check status (it reports "already exists" once the index is live). If the index already exists with a different dimension (e.g. after changing `EMBEDDING_MODEL`), the script updates it in place — then re-run the backfill with `--force`.

### 3 — Embedding model (local, no API key)

Embeddings are generated in-process with [sentence-transformers](https://www.sbert.net/) using `all-MiniLM-L6-v2` (384 dimensions). There is no API key and no per-request cost. The model (~90 MB) is downloaded from Hugging Face on first use and cached under `~/.cache/huggingface`. If the model fails to load, embedding is skipped (logged, never fatal) and semantic search falls back to keyword search.

**Footprint tradeoff** (measured on Windows, CPU-only torch):

| | httpx-only (hosted API) | Local model |
|---|---|---|
| Installed packages | ~82 MB | ~1.1 GB (torch, transformers, scipy, scikit-learn, …) |
| Server memory | ~75 MB | ~535 MB once the model is loaded |
| First semantic request | network call | ~14 s cold (model load), then ~60–90 ms |

The model is loaded lazily on the first embed, so the app and the test suite don't pay this cost until semantic search or a business create/update actually runs. Note that ~535 MB exceeds Render's free-tier 512 MB memory limit.

### 4 — Backfill existing businesses

Businesses created before this feature won't have an embedding yet:

```powershell
cd backend
.\venv\Scripts\python.exe scripts\backfill_embeddings.py          # dry run -- shows counts, writes nothing
.\venv\Scripts\python.exe scripts\backfill_embeddings.py --apply  # actually generates and writes embeddings
```

Same env-var pattern applies for running this against production — see the script's own docstring for details.

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
