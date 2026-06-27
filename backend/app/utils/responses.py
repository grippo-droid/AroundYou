from typing import Any, Optional
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

class ResponseModel:
    @staticmethod
    def success(data: Any = None, message: str = "Success", status_code: int = 200) -> JSONResponse:
        return JSONResponse(
            status_code=status_code,
            content={
                "success": True,
                "message": message,
                "data": jsonable_encoder(data),
            },
        )

    @staticmethod
    def error(message: str, status_code: int = 400, errors: Optional[Any] = None) -> JSONResponse:
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "message": message,
                "errors": jsonable_encoder(errors),
            },
        )
