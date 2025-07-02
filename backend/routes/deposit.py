from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from backend.core.templates import templates
from backend.core.auth import check_auth, NAV_LINKS

router = APIRouter()

@router.get("/deposits", response_class=HTMLResponse)
async def dashboard(request: Request):
    check_auth(request)
    return templates.TemplateResponse(
            "pages/admin/deposits.html", 
            {
                "request": request,
                "nav_links": NAV_LINKS,
                "current_page": "Deposits",
                "user": {"email": "admin@example.com","role": "admin"}  # Demo user
            }
        )
