import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, HTTPException, status
from app.config.settings import settings

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


def _configure():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


async def upload_image(file: UploadFile, folder: str = "nearme") -> str:
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, and WebP images are allowed.",
        )

    contents = await file.read()

    if len(contents) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be smaller than 5 MB.",
        )

    if not settings.CLOUDINARY_CLOUD_NAME:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.",
        )

    _configure()

    # Wrap the synchronous Cloudinary SDK call so any SDK/network error surfaces
    # as an HTTPException (caught by FastAPI's ExceptionMiddleware, which sits
    # inside the CORSMiddleware layer).  Without this, unhandled exceptions reach
    # ServerErrorMiddleware *outside* the CORS layer and the 500 response has no
    # Access-Control-Allow-Origin header, making the browser report a CORS error.
    try:
        result = cloudinary.uploader.upload(
            contents,
            folder=folder,
            resource_type="image",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Cloudinary upload failed: {exc}",
        ) from exc

    return result["secure_url"]
