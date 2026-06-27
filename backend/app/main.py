from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config.settings import settings
from app.config.database import db
from app.routes import auth, users, businesses, posts, jobs, messages, reviews, bookings, uploads, deals, applications, notifications

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db.connect()
    yield
    # Shutdown
    db.close()

app = FastAPI(
    title="NearMe Discovery Hub API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.requests import Request

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation Error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

@app.get("/")
async def root():
    return {"message": "Welcome to NearMe Discovery Hub API"}
