from fastapi import APIRouter, Request, Form, HTTPException
from fastapi.responses import RedirectResponse
from backend.core.firebase import auth as firebase_auth, db
from backend.core.templates import templates
from backend.core.auth import USERS #for demo purposes login
from datetime import timedelta
import json

router = APIRouter()
# templates = Jinja2Templates(directory="app/templates")

@router.get("/")
async def unauthorized(request: Request):
    print("This is the unauthorized route")
    token = request.cookies.get("auth_token")
    if token:
        try:
            firebase_auth.verify_id_token(token)  # ⬅️ actually verify the token
            return RedirectResponse(url="/dashboard", status_code=303)
        except:
            pass  # ⛔️ Token is invalid or expired, show login page anyway

    return templates.TemplateResponse("pages/unauthorized.html", {
        "request": request,
        "user": None,
        "nav_links": [],
    })
    # return templates.TemplateResponse("pages/auth/login.html", {
    #     "request": request,
    #     "user": None,
    #     "nav_links": [],
    # })

@router.get("/login")
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
        # Verify Firebase token
        decoded = firebase_auth.verify_id_token(token)
        uid = decoded.get("uid")
        
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token: Missing UID")

        # Get user document from Firestore
        user_doc = db.collection("users").document(uid).get()
        
        if not user_doc.exists:
            raise HTTPException(
                status_code=403,
                detail="Account not registered. Please contact admin."
            )

        user_data = user_doc.to_dict()
        
        # Normalize roles (handle both string and array formats)
        roles = []
        if 'roles' in user_data:
            roles = [str(role).lower() for role in user_data['roles']]
        elif 'role' in user_data:
            roles = [str(user_data['role']).lower()]
        
        # Check for roles
        is_admin = any(admin_role.lower() in (role.lower() for role in roles) for admin_role in ['admin', 'super'])
        is_crm = any(role.lower() == 'crm' for role in roles)
        
        # Access control
        if not is_admin and not is_crm:
            # No access: return empty or 403
           redirect_path = "/empty"

        # Determine redirect path based on admin status
        redirect_path = "/dashboard" if is_admin else "/crm"
        
        # Create session cookie
        expires_in = timedelta(days=7)
        session_cookie = firebase_auth.create_session_cookie(
            token,
            expires_in=expires_in
        )

        # Prepare response with appropriate redirect
        response = RedirectResponse(redirect_path, status_code=303)
        
        # Set cookies
        is_production = not request.url.hostname in ['localhost', '127.0.0.1']
        
        response.set_cookie(
            key="session",
            value=session_cookie,
            httponly=True,
            secure=is_production,
            samesite="lax",
            max_age=int(expires_in.total_seconds()),
            path="/",
        )
        
        # Include admin status in the roles cookie
        response.set_cookie(
            key="user_roles",
            value=json.dumps({
                "roles": roles,
                "is_admin": is_admin,
                "is_crm": is_crm
            }),
            httponly=True,
            secure=is_production,
            samesite="lax",
            max_age=int(expires_in.total_seconds()),
            path="/",
        )

        return response

    except Exception as e:
        print(f"Login error: {str(e)}")
        error_response = templates.TemplateResponse(
            "pages/auth/login.html",
            {"request": request, "error": "Login failed"},
            status_code=401
        )
        error_response.delete_cookie("session")
        error_response.delete_cookie("user_roles")
        return error_response
    
# from fastapi import APIRouter, Request
# from fastapi.responses import RedirectResponse
# import json

# router = APIRouter()

@router.get("/logout")
async def logout(request: Request):
    # Get cookies
    session_cookie = request.cookies.get("session")
    roles_cookie = request.cookies.get("user_roles")

    # Default redirect
    redirect_url = "/"

    # Parse user_roles JSON if it exists
    if roles_cookie:
        try:
            role_data = json.loads(roles_cookie)
            # Check if player flag is present and true
            if role_data.get("is_player"):
                redirect_url = "/kyc"
        except json.JSONDecodeError:
            pass

    # Log the session being logged out
    print(f"Logging out user with session: {session_cookie} and role: {roles_cookie}")

    # Clear cookies
    response = RedirectResponse(url=redirect_url)
    for cookie_name in ["session", "user_roles", "auth_token", "sub", "name"]:
        response.delete_cookie(cookie_name)

    return response

