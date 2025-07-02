from fastapi import APIRouter, Request, Form, HTTPException
from fastapi.responses import RedirectResponse
from backend.core.firebase import auth as firebase_auth, db
from backend.core.templates import templates
from backend.core.auth import USERS #for demo purposes login
from datetime import timedelta

router = APIRouter()
# templates = Jinja2Templates(directory="app/templates")

@router.get("/")
async def login_page(request: Request):
    token = request.cookies.get("auth_token")

    if token:
        try:
            firebase_auth.verify_id_token(token)  # ⬅️ actually verify the token
            return RedirectResponse(url="/dashboard", status_code=303)
        except:
            pass  # ⛔️ Token is invalid or expired, show login page anyway

    return templates.TemplateResponse("pages/auth/login.html", {
        "request": request,
        "user": None,
        "nav_links": [],
    })

@router.post("/login")
async def login(request: Request, token: str = Form(...)):
    try:
        decoded = firebase_auth.verify_id_token(token)
        uid = decoded.get("uid")
        email = decoded.get("email")

        # 🔍 Check if the user exists in Firestore
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=403, detail="Account not registered in system.")


        response = RedirectResponse("/dashboard", status_code=303)
        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            # max_age=60 * 5,        # 5 minutes in seconds
            # expires=60 * 5,
            max_age=60 * 60 * 24 * 7,  # 7 days in seconds
            expires=60 * 60 * 24 * 7,
            samesite="lax",
            secure=False  # Change to True in production (HTTPS)
        )
        return response

    except Exception as e:
        return templates.TemplateResponse("pages/auth/login.html", {
            "request": request,
            "error": f"Login failed: {str(e)}"
        }, status_code=401)
    
@router.get("/logout")
async def logout():
    response = RedirectResponse(url="/")
    response.delete_cookie("auth_token")
    return response
