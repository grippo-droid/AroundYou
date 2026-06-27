from fastapi import APIRouter, Depends, UploadFile, File
from app.core.dependencies import get_current_user
from app.models.user import UserModel
from app.services.upload_service import upload_image
from app.utils.responses import ResponseModel

router = APIRouter()


@router.post("/image")
async def upload_image_endpoint(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
):
    url = await upload_image(file, folder="nearme")
    return ResponseModel.success(data={"url": url}, message="Image uploaded successfully")
