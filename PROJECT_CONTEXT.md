# AroundYou (a.k.a. NearMe Discovery Hub) — Project Context

> Purpose of this file: a complete briefing for an AI assistant (or new developer) picking up this project.
> Snapshot date: 2026-10-01 (as of commit `8d9f10f`). Branch: `main`. Repo: `grippo-droid/AroundYou`.
> Anything marked **local only** below exists in the owner's working tree but is NOT in the repo yet.

---

## 1. What the product is

A **hyper-local business discovery platform for urban India**. Users find nearby cafes, salons, clinics, restaurants and other businesses. They can book appointments, follow businesses, read and write reviews, message owners, browse a social feed of business posts, see deals, and apply for local jobs.

There are **three roles**:
- `user`: browse, book, review, follow, message, apply for jobs
- `business`: owns and manages businesses (profile, staff, availability, bookings, posts, deals, jobs, applications, review replies, analytics)
- `admin`: moderation portal (stats, users, business verification queue, reviews, reports)

Demo data covers **Bhopal, Pune and Mumbai** (see `backend/seed.py`).

---

## 2. Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), React Router v6, TanStack Query (provider only, most calls are plain axios), axios, Leaflet/react-leaflet (map), Recharts (dashboard charts), framer-motion, sonner (toasts), next-themes (dark mode), Vitest |
| Backend | FastAPI, Python 3.11, Uvicorn, Motor (async MongoDB), Pydantic v2 + pydantic-settings, PyJWT, passlib[argon2], httpx, Cloudinary SDK |
| Database | MongoDB (local for dev; **MongoDB Atlas** in prod) |
| Auth | Phone + password. JWT stored in an **HTTP-only cookie** (`access_token`). Argon2 password hashing |
| Images | Cloudinary (`POST /uploads/image`) |
| AI (in progress, local only) | Local sentence-transformers embeddings (`all-MiniLM-L6-v2`, 384 dims, CPU torch) + Atlas Vector Search for semantic business search |
| Hosting | Frontend on **Vercel** (`nearme-discovery-hub/vercel.json`, SPA rewrite). Backend on **Render** free tier (`backend/render.yaml`), which has 30–60 s cold starts. **Render auto-deploys every push to `main`.** Python is pinned to 3.11 via `backend/.python-version` (Render reads it from the service Root Directory, `backend/`) |

The frontend was originally scaffolded with **Lovable** (`.lovable/plan.md`, `lovable-tagger` dev dependency). Package name is still `vite_react_shadcn_ts`.

---

## 3. Repository structure

```
Around_You/
├── README.md                      # Main README (partly stale: still mentions OTP auth, see §8)
├── PROJECT_CONTEXT.md             # This file
├── backend/                       # FastAPI API
│   ├── app/
│   │   ├── main.py                # App factory: lifespan (connect DB + ensure_indexes), CORS, routers, global exception handlers, / and /health
│   │   ├── config/
│   │   │   ├── settings.py        # pydantic-settings Settings (reads backend/.env)
│   │   │   └── database.py        # Motor client wrapper `db`, get_database(), ensure_indexes() (unique indexes)
│   │   ├── core/
│   │   │   ├── dependencies.py    # get_current_user (cookie JWT), get_optional_user, get_current_business_owner
│   │   │   ├── jwt.py             # create/decode access token (HS256)
│   │   │   ├── security.py        # argon2 hash/verify
│   │   │   └── logging_config.py  # structured logging setup (LOG_LEVEL)
│   │   ├── models/                # MongoDB document models (Pydantic, `_id` alias via PyObjectId)
│   │   │   ├── user.py, business.py (+StaffMember), booking.py (+Availability, DaySchedule),
│   │   │   ├── review.py, post.py, job.py, application.py, deal.py,
│   │   │   └── conversation.py, message.py, notification.py
│   │   ├── schemas/               # Request/response schemas (Create/Update/Response). otp.py is legacy/unused
│   │   ├── services/              # Business logic, static-method classes per domain
│   │   │   ├── auth_service, user_service, business_service, booking_service, review_service,
│   │   │   ├── post_service, job_service, application_service, deal_service, message_service,
│   │   │   ├── notification_service, upload_service (Cloudinary)
│   │   │   ├── ai_service.py      # local only: MiniLM embeddings (sentence-transformers)
│   │   │   └── otp_service.py, sms_service.py   # legacy (OTP removed), not imported anywhere
│   │   ├── routes/                # APIRouters, one per domain (see §5)
│   │   └── utils/
│   │       ├── object_id.py       # PyObjectId Pydantic type
│   │       └── responses.py       # ResponseModel.success/error -> {success, message, data}
│   ├── scripts/
│   │   ├── test_*_concurrency.py          # manual concurrency/race scripts (booking, follow, registration, review)
│   │   ├── create_vector_search_index.py  # local only: creates Atlas vector index
│   │   └── backfill_embeddings.py         # local only: dry-run-by-default embedding backfill
│   ├── tests/                     # pytest suite (see §7)
│   ├── seed.py                    # ~1190 lines: realistic multi-city demo dataset (6 reviewers, no duplicate review pairs)
│   ├── cleanup_user.py, verify_messaging.py, test_login.ps1, test_output.txt   # old ad-hoc dev scripts/artifacts
│   ├── requirements.txt, requirements-dev.txt, pytest.ini, render.yaml, .env.example, .python-version (3.11)
│
└── nearme-discovery-hub/          # React frontend
    ├── src/
    │   ├── App.tsx                # Providers + all routes (see §6)
    │   ├── main.tsx
    │   ├── lib/api_client.ts      # axios instance: baseURL = VITE_API_URL || http://localhost:8000, withCredentials: true
    │   ├── services/api.ts        # ~790 lines: every API call + mappers from API shapes to UI types
    │   ├── services/mockData.ts   # leftover Lovable mocks; still used for `categories` list and Feed fallback posts
    │   ├── context/AuthContext.tsx # user, login/register/logout, /auth/me check, followingIds set
    │   ├── components/            # Navbar, Footer, BusinessCard, Map (Leaflet), BookingTab, ImageUpload,
    │   │                          # CreateJobDialog, NotificationPanel, PrivateRoute, Logo, theme toggle, ui/ (shadcn)
    │   ├── hooks/                 # useGeolocation, useBookmarks, use-mobile, use-toast
    │   ├── pages/                 # one file per route (see §6)
    │   └── types/                 # api.ts (backend shapes), index.ts (UI shapes)
    ├── vercel.json, vite.config.ts (dev port 8080), tailwind.config.ts, vitest.config.ts, .env.example
```

---

## 4. Backend conventions (follow these when adding code)

- **Layering**: route → service (static methods on a `XService` class) → Motor `get_database()`. Routes stay thin.
- **Responses**: most endpoints return `ResponseModel.success(data=..., message=...)`, giving the shape `{ "success": true, "message": "...", "data": ... }`. Errors are raised as `HTTPException(status_code, detail)`. The frontend reads `response.data.data` and `error.response.data.detail || .message`.
- **IDs**: Mongo `_id` is an ObjectId. Cross-references between documents are stored as **strings** (`owner_id`, `business_id`, `user_id`, …). Malformed ObjectIds should return **400**, not 500 (fixed in user/message routes, with regression tests).
- **Auth**: `Depends(get_current_user)` for logged-in users, `get_current_business_owner` for business/admin, and `require_admin` inside `routes/admin.py`. The cookie is set by `_set_auth_cookie` in `routes/auth.py`. `COOKIE_SECURE=True` in prod makes `SameSite=None`, because Vercel to Render is cross-site.
- **Concurrency safety** (recent focus): races are prevented with **unique indexes plus catching DuplicateKeyError**, which returns **409**. Counters are updated atomically, only when the state actually changed. Indexes live in `database.ensure_indexes()`:
  - `bookings`: unique `(business_id, date, time_slot)`, partial on `status in [pending, confirmed]`, to stop double-booking
  - `users.phone` unique, to stop duplicate registration
  - `reviews`: unique `(business_id, user_id)`, one review per user per business
- **Logging**: `logging.getLogger(__name__)`. A global handler turns unhandled exceptions into a 500 response (`{"detail": "Internal server error"}`) and logs them. Validation errors are logged and return 422.
- Phone numbers are normalised (spaces stripped, `+91…` format).

### Data model summary (MongoDB collections)
- **users**: name, email?, phone (unique), password_hash, role, is_verified, followers[], following[], followed_businesses[], bookmarked_businesses[], applied_jobs[]
- **businesses**: owner_id, name, category, description, address, city, location{lat,lng}, contact_number, whatsapp, timings[], images[], services[], staff[], verification_status (pending/approved/rejected), is_verified, is_active, rating, review_count, followers, views, created_at. Local-only additions: `embedding`, `embedding_updated_at`, transient `similarity_score`
- **availability**: business_id, schedules[{day 0–6 Mon–Sun, start_time, end_time, is_active}], slot_duration
- **bookings**: business_id/name, user_id/name/phone, service, date "YYYY-MM-DD", time_slot "HH:MM", status (pending/confirmed/cancelled/completed), notes
- **reviews**: business_id, user_id, user_name, rating 1–5, text, owner_reply, owner_reply_at
- **posts**: business_id/name/avatar, image, caption, likes, comments[]
- **jobs**: business_id/name/logo, title, description, location, type, salary, is_active, applicants[]
- **applications**: job_id/title, business_id, applicant_user_id, name, phone, email, resume_url, cover_note, status (pending/reviewed/rejected/accepted)
- **deals**: business_id/name, title, description, discount_label, discount_percentage, prices, valid_until, is_active
- **conversations** / **messages**: participant-based chat (user ↔ business)
- **notifications**: user_id, type (booking_*, new_review, application_status, business_approved/rejected), title, body, is_read, related_id
- **reports**: business reports from users, which admins review

New businesses start as `verification_status="pending"`. An admin approves (`is_verified=True`) or rejects (`is_active=False`). Listings sort verified businesses first.

---

## 5. API surface (prefix → endpoints)

- `/auth`: `POST /register`, `POST /login` (sets cookie), `POST /logout`, `POST /admin/register` (needs `ADMIN_SECRET_KEY`), `GET /me`
- `/users`: `PUT /profile`, `GET /search?query=`, `GET /{id}`, `POST|DELETE /{id}/follow`, `GET /{id}/businesses`, `POST /bookmarks/{business_id}` (toggle), `GET /me/bookmarks`
- `/businesses`: `POST /`, `GET /` (search, category, skip/limit pagination, `has_more`), `GET /my-businesses`, **`GET /search/semantic?q=&limit=`** (local only), `GET /{id}/stats`, `GET /{id}` (increments views in a background task), `PUT /{id}`, `DELETE /{id}`, `GET|POST /{id}/staff`, `DELETE /{id}/staff/{staff_id}`
- Follows (no prefix): `POST /businesses/{id}/follow` (toggle), `GET /businesses/{id}/followers`, `GET /users/me/following`
- `/bookings`: `GET|POST /business/{id}/availability`, `GET /business/{id}/slots?date=`, `POST /business/{id}/book`, `GET /my`, `PUT /{id}/cancel`, `GET /business/{id}/appointments`, `PUT /{id}/status`
- `/reviews`: `GET /business/{id}`, `POST /business/{id}`, `PUT /{id}/reply` (owner reply)
- `/posts`: `POST /{business_id}`, `GET /business/{id}`, `GET /` (feed, optional following-only), `POST /{post_id}/comments`
- `/jobs`: `GET /`, `GET /business/{id}`, `POST /business/{id}`, `GET /{id}`
- `/applications`: `GET /my-job-ids`, `POST /jobs/{job_id}/apply`, `GET /jobs/{job_id}`, `GET /business/{id}`, `DELETE /{id}`, `PUT /{id}/status`
- `/deals`: `GET /`, `GET /business/{id}`, `POST /business/{id}`, `DELETE /{id}`
- `/messages`: `POST /send`, `GET /conversations`, `GET /{conversation_id}`
- `/notifications`: `GET /`, `GET /unread-count`, `PUT /read-all`, `PUT /{id}/read`
- `/uploads`: `POST /image` (Cloudinary)
- `/reports`: `POST /business/{id}`
- `/admin`: `GET /stats`, `GET /users`, `PUT /users/{id}/role`, `GET /businesses`, `PUT /businesses/{id}/status`, `GET /verification-queue`, `PUT /businesses/{id}/verify`, `GET /reviews`, `DELETE /reviews/{id}`, `GET /reports`, `DELETE /reports/{id}`
- `GET /`, `GET /health`. Swagger UI is at `/docs`.

---

## 6. Frontend routes (`src/App.tsx`)

Public: `/` (Index: hero, categories, CTAs), `/explore` (list + Leaflet map view, category filter, search, infinite scroll, geolocation distance), `/business/:id` (profile with tabs: about/timings/services/gallery/posts/jobs/deals/reviews, booking tab, follow, report, WhatsApp/call/directions), `/login`, `/register`, `/admin-login`, `/jobs`, `/jobs/:id` (detail + apply dialog), `/profile/:id`.

Behind `PrivateRoute`: `/dashboard` (business owner analytics and management, restricted to business/admin roles), `/add-business`, `/edit-business/:id`, `/business/:id/staff`, `/business/:id/availability`, `/feed` (posts from followed businesses, save button stored in localStorage), `/messages`, `/profile` (incl. Saved Posts tab), `/admin` (stats, users, businesses, verification queue, reviews, reports tabs), `/bookings`.

Design: logo/favicon, Google-Maps-like palette, Space Grotesk headline with a cobalt-to-coral gradient, light/dark theme toggle.

---

## 7. Testing

- **Backend pytest** (`backend/tests`, `pytest.ini` uses asyncio auto mode, session loop). `conftest.py` forces `DB_NAME=around_you_test_db` on local Mongo and refuses to run against any other DB. It wipes all collections before each test and uses httpx `ASGITransport` against the app.
  - `test_auth.py`, `test_error_handling.py` (global 500 handler), `test_object_id_validation.py` (400 on bad ids), `test_race_booking.py`, `test_race_follow.py`, `test_race_registration.py`, `test_race_reviews.py`, `test_seed.py` (seed data has no duplicate review pairs / unknown reviewers / duplicate phones; needs no DB)
  - Run: `cd backend; .\venv\Scripts\python.exe -m pytest` (install `requirements-dev.txt`, and local MongoDB must be running)
- `backend/scripts/test_*_concurrency.py`: standalone scripts that hammer a running server to show the race fixes work.
- Frontend: Vitest is configured but only has `src/test/example.test.ts` (a placeholder).

---

## 8. History: what has been done (oldest → newest)

1. **Initial build**: full app (from a Lovable mock-data scaffold, wired to a real FastAPI backend).
2. Business follow system and owner analytics dashboard. README and seed script.
3. Fixes: React Router warnings, login phone normalisation, dashboard restricted to business/admin.
4. Live admin panel with backend API. Map view on Explore with category-coloured markers.
5. Messaging fixed (string IDs in queries, ResponseModel wrapping).
6. Branding: logo, favicon, palette, new hero typography.
7. Business **verification workflow**, admin portal, post comments, **report system**. Reports tab in admin.
8. Feed save button (localStorage) and Saved Posts tab on Profile.
9. Seed rewritten with a realistic multi-city dataset (25 businesses with category images).
10. **Deployment prep**: Vercel (frontend) + Render (backend), env-driven CORS, cross-site cookie settings.
11. Owner replies to reviews, infinite scroll on Explore.
12. **OTP auth removed**: login and registration are now password-only.
13. Removed hardcoded "Bangalore" labels. Job detail page with apply dialog. Fixed `isBusinessOpen` (full day names, en-dash in hours). Fixed cover images. README cold-start note.
14. **Hardening pass** (most recent work):
    - Double-booking race fixed (unique partial index + duplicate handling, returns 409)
    - Auth cookie now set on the actual returned response (cookie auth was silently broken before)
    - Unique `users.phone` index + 409 on duplicate registration race
    - Unique review index + 409 on duplicate review race
    - Follower counter updates made atomic and conditional on a real state change
    - 400 (not 500) for malformed ObjectIds in user and message routes
    - Structured logging + global exception handler
    - pytest suite with race-condition regression tests
15. **2026-10-01**:
    - `7c871b3` fix: `seed.py` gave each business 6 reviews from only 4 reviewers (50 duplicate pairs), which made the unique review index fail at startup on any freshly seeded DB. Added 2 reviewers, made reviewer assignment avoid repeats, and added `tests/test_seed.py`. Production was checked read-only beforehand: 0 duplicates on all three unique constraints.
    - `8d9f10f` chore: pinned Python 3.11 (`backend/.python-version`); Render previously defaulted to 3.14.3. Verified in the build log: `Using Python version 3.11.16 via .../backend/.python-version`.

### Currently in progress (local only, not in the repo)
**Semantic (natural-language) business search** using local sentence-transformers embeddings + MongoDB Atlas Vector Search (switched from OpenAI on 2026-10-01 because the OpenAI account had no credits):
- `app/services/ai_service.py`: `embed_text()` runs `all-MiniLM-L6-v2` in a worker thread. The model is loaded lazily, once per process; vectors are normalized. It is best-effort: it returns `None` on any failure or timeout. The model load is excluded from the timeout.
- `business_service.py`: `build_embed_text(name, category, description, services)`. Embeds on create, and re-embeds on update when name/category/description/services change. `_EMBEDDING_PROJECTION` keeps the embedding out of every normal read. `semantic_search()` runs a `$vectorSearch` aggregation on index `business_embedding_index` with filter `is_active != False`, and returns `None` on failure.
- `routes/businesses.py`: `GET /businesses/search/semantic` with a 300-character query limit and a result limit capped at 50. If semantic search returns `None`, it **falls back to keyword search** and sets `degraded_to_keyword_search: true`.
- `models/business.py`: `embedding`, `embedding_updated_at`, `similarity_score` fields.
- Settings/env: `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` (384), also in `.env.example`. No API key. `requirements.txt` adds CPU-only `torch` + `sentence-transformers` (about +1 GB installed, about 535 MB server memory once loaded vs about 75 MB without).
- Scripts: `create_vector_search_index.py` (Atlas only, idempotent) and `backfill_embeddings.py` (dry run by default, `--apply`, `--force`).
- README has a new "Semantic Search Setup" section.
- **Verified on dev (2026-10-01)**: the `around_you_dev_db` index is at 384 dims and READY, all 25 businesses are embedded, and 3 real queries return sensible rankings.
- **Not done yet**: the frontend does not call the semantic endpoint, there are no tests for semantic search, the prod Atlas index has not been created or resized, and prod has not been backfilled. The ~535 MB memory use exceeds Render's free-tier 512 MB.
- **Do not push this to `main` until the memory question is resolved**: Render auto-deploys, and ~535 MB exceeds the free tier's 512 MB.
- Known follow-ups: no minimum similarity score (always returns `limit` results, so the tail is filler); responses include `embedding: null` / `embedding_updated_at` because the endpoint returns the raw model; the model contacts Hugging Face on every load unless `HF_HUB_OFFLINE=1`; `seed.py` drops `businesses`, which deletes the Atlas vector index, so after re-seeding run the index script and the backfill again.

---

## 9. Known gaps / tech debt

- README still advertises "OTP + Password Auth" and SMS env vars. OTP was removed in commit `7db1195`. `otp_service.py`, `sms_service.py` and `schemas/otp.py` are dead code.
- No rate limiting anywhere (this is noted in a comment on the semantic endpoint).
- `ADMIN_SECRET_KEY` has a weak default (`aroundyou-admin-secret`). It must be overridden in prod.
- `services/mockData.ts` is still imported for the `categories` list and as a Feed fallback. Categories should come from one real source.
- Feed "saved posts" and some bookmarks live only in localStorage, so they don't sync across devices.
- Stray dev files in `backend/`: `cleanup_user.py` (imports a non-existent `database` symbol), `verify_messaging.py`, `test_login.ps1`, `test_output.txt`.
- Frontend has essentially no tests. The axios 401 interceptor is a stub.
- Render free tier cold starts (30–60 s).
- `backend/.env` locally sets `CORS_ORIGINS`, but the app reads `ALLOWED_ORIGINS` (localhost origins are always allowed, so local dev is unaffected).
- The demo credentials in the README are for seeded local data only.

---

## 10. Running locally (Windows / PowerShell)

```powershell
# 1. MongoDB
mongod --dbpath C:\data\db

# 2. Backend
cd backend
python -m venv venv; .\venv\Scripts\activate
pip install -r requirements-dev.txt
Copy-Item .env.example .env        # set MONGO_URI=mongodb://localhost:27017, JWT_SECRET, COOKIE_SECURE=False
.\venv\Scripts\python.exe seed.py
.\venv\Scripts\uvicorn.exe app.main:app --reload --port 8000

# 3. Frontend
cd nearme-discovery-hub
npm install
npm run dev                         # http://localhost:8080 (VITE_API_URL defaults to http://localhost:8000)
```

Seeded logins: user `+919876543210` / `password123`, business `+919654321098` / `business123`, admin `+910000000000` / `admin123`.

---

## 11. Working agreements with the owner (for an AI assistant)

- Git commits: split into **logical, focused commits** (conventional style: `feat:`, `fix:`, `test:`). **No AI attribution lines.** Always show the diff and wait for explicit approval before committing or pushing.
- After approval, push to `grippo-droid/AroundYou` (`main`).
- Bug fixes should come with a regression test (pytest) and, for races, a concurrency script in `backend/scripts/`.
- Match the existing style: service classes with static methods, `ResponseModel.success`, best-effort external calls that degrade gracefully, and explanatory comments on non-obvious decisions.
