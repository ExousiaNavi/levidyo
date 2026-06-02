import json
from fastapi import APIRouter, Request, Query
from backend.core.templates import templates
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from backend.core.auth import check_auth, NAV_LINKS_CRM
from backend.core.deposit import get_hourly_deposit_data
from backend.core.amount import get_target_amount 
from backend.filters.brand import get_all_brands, get_supported_currencies, get_default_currency
from datetime import datetime, timezone
from typing import Optional
router = APIRouter()
date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
now = datetime.now()
formatted = now.strftime('%Y-%m-%d %H:00')

@router.get("/crm", response_class=HTMLResponse)
async def crm_dashboard(request: Request):
    user = check_auth(request)
    if isinstance(user, RedirectResponse):
        return user

     # user_roles = request.cookies.get("user_roles") or "Admin"
    user_roles_raw = request.cookies.get("user_roles")
    user_roles = {}

    # Safely parse the cookie
    if user_roles_raw:
        try:
            user_roles = json.loads(user_roles_raw)
        except json.JSONDecodeError:
            pass  # fallback to empty dict
    
    is_admin = user_roles.get("is_admin", False)
    is_crm = user_roles.get("is_crm", False)
    # Use only cookies (cleaner URL)
    # brand = request.cookies.get("brand") or "default_brand"
    # currency = request.cookies.get("currency") or "USD"

    # Fetch data for the dashboard
    # data = get_dashboard_data(brand, currency)

    if is_admin or is_crm:
        return templates.TemplateResponse("pages/crm/dashboard.html", {
            "request": request,
            "user": user,
            # "data": data,
            "nav_links": NAV_LINKS_CRM,
            "current_page": "CRM",
            # "brand": brand,
            # "currency": currency,
        })
    
    # elif is_admin:
    #     # If user is not admin, redirect to CRM dashboard
    #     return RedirectResponse(url="/dashboard", status_code=303)
    
    else:
        # If user is not authorized, redirect to empty page
        return RedirectResponse(url="/empty", status_code=303)