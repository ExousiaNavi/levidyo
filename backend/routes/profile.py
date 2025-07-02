from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from backend.core.templates import templates
from backend.core.auth import check_auth, NAV_LINKS
from backend.core.users import get_non_super_users  
from backend.core.role import get_roles_from_app_roles 
from backend.core.amount import get_target_amount  

router = APIRouter()

@router.get("/profile", response_class=HTMLResponse)
async def profile(request: Request):  # Better name than 'dashboard' here
    user = check_auth(request)  # 🔐 Get user from Firestore
    users = get_non_super_users() # Get users except super
    roles = get_roles_from_app_roles() #Get All the roles exclude super
    target_amount = get_target_amount()  # 👈 get value from Firestore

    return templates.TemplateResponse(
        "pages/admin/profile.html",
        {
            "request": request,
            "nav_links": NAV_LINKS,
            "current_page": "Profile",
            "user": user,  # authenticated users info
            "users": users,
            "roles": roles,
            "target_amount": target_amount,
        }
    )

