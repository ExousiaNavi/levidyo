from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/validate-username")
async def validate_username(request: Request):
    data = await request.json()
    username = data.get("username")

    if not username:
        return {"isValid": False}

    # Example validation
    # is_valid = username.lower() != "admin"
    return {"isValid": True, "username": username}