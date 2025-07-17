from fastapi import APIRouter, Request, Form, HTTPException
from fastapi.responses import RedirectResponse
from backend.core.firebase import auth as firebase_auth, db
from backend.core.templates import templates
from backend.core.auth import USERS #for demo purposes login
from datetime import timedelta
import json

router = APIRouter()

@router.get("/camera")
async def camera_page(request: Request):
    # token = request.cookies.get("auth_token")
    # if token:
    #     try:
    #         firebase_auth.verify_id_token(token)  # ⬅️ actually verify the token
    #         return RedirectResponse(url="/dashboard", status_code=303)
    #     except:
    #         pass  # ⛔️ Token is invalid or expired, show login page anyway

    # user_roles_raw = request.cookies.get("user_roles")
    # user_roles = {}

    # Safely parse the cookie
    # if user_roles_raw:
    #     try:
    #         user_roles = json.loads(user_roles_raw)
    #     except json.JSONDecodeError:
    #         pass  # fallback to empty dict
    
    # is_admin = user_roles.get("is_admin", False)
    # is_crm = user_roles.get("is_crm", False)

    # if not is_admin and not is_crm:
    #     return templates.TemplateResponse("pages/blank.html", {
    #         "request": request,
    #         "user": None,
    #         "nav_links": [],
    #     })
    # elif is_admin:
    #     return RedirectResponse(url="/dashboard", status_code=303)
    
    # else:
        return templates.TemplateResponse("pages/camera.html", {
            "request": request,
            "user": None,
            "nav_links": [],
        })