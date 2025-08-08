import json
from fastapi import APIRouter, Request, Query
from backend.core.templates import templates
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from backend.core.auth import NAV_LINKS_KYC
# from datetime import datetime, timezone
# from typing import Optional
from backend.core.auth import check_auth_kyc
router = APIRouter()

@router.get("/kyc/verified", response_class=HTMLResponse)
async def verified(request: Request):
    user = check_auth_kyc(request)
    print(f"Request: {user}")

    kyc_status_str = user.get("user", {}).get("kyc_status", "not-verified")
    kyc_status = kyc_status_str == "verified"

    # Only show verified page if verified
    if kyc_status:
        return templates.TemplateResponse("pages/kyc/verified.html", {
            "request": request,
            "user": "",
            "nav_links": NAV_LINKS_KYC,
            "current_page": "Verified",
        })

    # Not verified? Go back to dashboard
    return RedirectResponse("/kyc/dashboard", status_code=302)

