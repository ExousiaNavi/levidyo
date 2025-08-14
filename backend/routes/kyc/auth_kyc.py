from fastapi import APIRouter, Request, Form, HTTPException
from fastapi.responses import RedirectResponse
from backend.core.templates import templates
from backend.sessions.session_manager import create_user_session
import json
from pathlib import Path

router = APIRouter()

@router.post("/kyc/login")
async def login(
    request: Request, 
    user_id: str = Form(...), 
    password: str = Form(...)):
    try:

        # FOR TESTING  # ✅ Load users from JSON
        print(user_id, password)
        json_path = Path(__file__).resolve().parent.parent.parent / "data" / "players.json"
        with open(json_path, "r", encoding="utf-8") as f:
            users = json.load(f)

        # ✅ Find user
        user = next((u for u in users if u["user_id"] == user_id), None)

        # Validate credentials
        if not user or user["password"] != password:
            error_response = templates.TemplateResponse(
                "pages/kyc/auth.html",
                {"request": request, "error": "Invalid username or password"},
                status_code=401
            )
            error_response.delete_cookie("session")
            error_response.delete_cookie("user_roles")
            return error_response
        
        roles = ["user"]
        is_admin = "admin" in roles
        is_crm = "crm" in roles

        # ✅ Use reusable session creator
        return await create_user_session(
            request,
            user_id=user["user_id"],
            roles=roles,
            is_admin=is_admin,
            is_crm=is_crm,
            is_player=True,
            redirect_path="/kyc/identification"
        )

    except Exception as e:
        print(f"Login error: {str(e)}")
        error_response = templates.TemplateResponse(
            "pages/kyc/auth.html",
            {"request": request, "error": "Login failed"},
            status_code=401
        )
        error_response.delete_cookie("session")
        error_response.delete_cookie("user_roles")
        return error_response