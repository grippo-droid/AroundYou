import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.logging_config import configure_logging

configure_logging()
logger = logging.getLogger(__name__)

from app.config.settings import settings
from app.config.database import db
from app.routes import auth, users, businesses, posts, jobs, messages, reviews, bookings, uploads, deals, applications, notifications, follows, admin, reports
from app.services import ai_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db.connect()
    await db.ensure_indexes()
    # Load the embedding model in the background (~1-2 s) so the first semantic
    # search doesn't pay for it -- not awaited, so the app starts serving at once.
    app.state.embedding_warmup = asyncio.create_task(ai_service.warm_up())
    yield
    # Shutdown
    app.state.embedding_warmup.cancel()
    db.close()

app = FastAPI(
    title="NearMe Discovery Hub API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware — always include local dev origins; extend via ALLOWED_ORIGINS env var
_local_origins = ["http://localhost:5173", "http://localhost:8080"]
_extra_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
_all_origins = list(dict.fromkeys(_local_origins + _extra_origins))  # deduplicated, order preserved

app.add_middleware(
    CORSMiddleware,
    allow_origins=_all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(businesses.router, prefix="/businesses", tags=["Businesses"])
app.include_router(posts.router, prefix="/posts", tags=["Posts"])
app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(messages.router, prefix="/messages", tags=["Messages"])
app.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
app.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
app.include_router(uploads.router, prefix="/uploads", tags=["Uploads"])
app.include_router(deals.router, prefix="/deals", tags=["Deals"])
app.include_router(applications.router, prefix="/applications", tags=["Applications"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(follows.router, tags=["Follows"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.requests import Request

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        "Validation error on %s %s: %s", request.method, request.url.path, exc.errors()
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled %s on %s %s: %s",
        type(exc).__name__,
        request.method,
        request.url.path,
        exc,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

@app.get("/")
async def root():
    return {"message": "Welcome to NearMe Discovery Hub API"}

@app.get("/health")
async def health():
    return {"status": "ok", "message": "AroundYou API is running"}
