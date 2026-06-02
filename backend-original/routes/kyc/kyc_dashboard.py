import json
from fastapi import APIRouter, Request, Query
from backend.core.templates import templates
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from backend.core.auth import NAV_LINKS_KYC
# from datetime import datetime, timezone
# from typing import Optional
from backend.core.auth import check_auth_kyc
router = APIRouter()

@router.get("/kyc/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    user = check_auth_kyc(request)  # You should ensure this returns the session dict
    print(f"Request: {user}")
    
    kyc_status_str = user.get("user", {}).get("kyc_status", "not-verified")
    kyc_status = kyc_status_str == "verified"
    
    if user and not kyc_status:
        return templates.TemplateResponse("pages/kyc/dashboard.html", {
            "request": request,
            "user": user,
            "nav_links": NAV_LINKS_KYC,
            "current_page": "Dashboard",
        })
    else:
        return RedirectResponse("/kyc/verified", status_code=302)
