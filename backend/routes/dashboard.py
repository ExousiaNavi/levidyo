from fastapi import APIRouter, Request, Query
from backend.core.templates import templates
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from backend.core.auth import check_auth, NAV_LINKS
from backend.core.deposit import get_hourly_deposit_data
from backend.core.amount import get_target_amount 
from backend.filters.brand import get_all_brands, get_supported_currencies, get_default_currency
from datetime import datetime, timezone
from typing import Optional
router = APIRouter()
date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
now = datetime.now()
formatted = now.strftime('%Y-%m-%d %H:00')

def getLabel(label):
    if label == "deposit":
        return "Deposit"
    elif label == "withdraw":
        return "Withdraw"
    elif label == "pendingdeposit":
        return "Pending Deposit"
    elif label == "pendingwithdraw":
        return "Pending Withdraw"
    else:
        return "Undefined"

@router.get("/api/dashboard-data")
async def get_dashboard_data(
    request: Request,
    brand: str = Query(...),
    currency: str = Query(...),
    # table: Optional[str] = Query(None),
    # tab: str = Query(...),
    
):
    try:
        # # Use only cookies (cleaner URL)
        # # table
        # table = request.cookies.get("sub") or "deposit"
        # # Name
        # tab = request.cookies.get("name") or "Deposit"
        # print("This is the ajax request...")
        # print(table,tab)
        
        # # Normalize table input
        # # if not table or table.strip().lower() == "null":
        # #     table = "deposit"
        # # print(table)
        # # date = "2025-04-21"  # You can later make this dynamic
        # combined_key = f"{brand}_{currency}"
        # data = get_hourly_deposit_data(date, combined_key, brand, table)
        # target = get_target_amount()

        # return JSONResponse({
        #     "tab": tab,
        #     "kpis": data["kpis"],
        #     "target": target,
        #     "history_log": data["history_log"],  # optional if you plan to use it
        #     "chart_hours": data["chart_hours"],
        #     "today_values": data["today_values"],
        #     "cumulative_values": data["cumulative_values"],
        #     "last_day_values": data["last_day_values"],
        #     "last_cumulative_values": data["last_cumulative_values"],
        # })

        tabs = ["deposit", "withdraw", "pendingdeposit", "pendingwithdraw"]
        result = {}
        target = get_target_amount()
        combined_key = f"{brand}_{currency}"
        # for debug data
        date = "2025-06-16"
        for tab in tabs:
            data = get_hourly_deposit_data(date, combined_key, brand, tab)
            result[tab] = {
                "tab": getLabel(tab),
                "kpis": data["kpis"],
                "target": target,
                "history_log": data.get("history_log", []),
                "chart_hours": data["chart_hours"],
                "today_values": data["today_values"],
                "cumulative_values": data["cumulative_values"],
                "last_day_values": data["last_day_values"],
                "last_cumulative_values": data["last_cumulative_values"],
                "time": formatted
            }

        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, brand: str = Query(default=None),
    currency: str = Query(default=None)
    # sub: str = Query(default='deposit'),
    # tab: str = Query(default='Deposit')
    ):

    user = check_auth(request)
    if isinstance(user, RedirectResponse):
        return user

    # Use only cookies (cleaner URL)
    sub = request.cookies.get("sub") or "deposit"
    tab = request.cookies.get("name") or "Deposit"
    print(sub,tab)
    # 1. All available brands
    brands = get_all_brands()  # e.g., ['bj', 'baji']

    # 2. Use first brand if none provided
    brand = brand or brands[0]

    # 3. Get supported currencies for brand
    available_currencies = get_supported_currencies(brand)  # e.g., ['BDT', 'PKR']

    # 4. Use default currency if none or invalid
    if not currency or currency not in available_currencies:
        currency = get_default_currency(brand)

    # 5. Use brand_currency key
    key = f"{brand}_{currency}"
    # date = "2025-04-21"
    data = get_hourly_deposit_data(date, key, brand, sub)
    target_amount = get_target_amount()

    # 6. Pass values to frontend
    data = data or {}

    return templates.TemplateResponse("pages/admin/dashboard.html", {
        "request": request,
        "nav_links": NAV_LINKS,
        "current_page": sub,
        "tab": tab,
        "user": user,
        "current_datetime": formatted,
        "target": target_amount,
        "kpis": {
            "ld_deposit": 0,
            "ld_cumulative": 0,
            "cdod": 0,
            "cwow": 0,
            "hdod": 0,
            "hwow": 0,
            "today_deposit": 0,
            "today_cumulative": 0,
            "total_pending_amount": data.get("kpis", {}).get("total_pending_amount", 0),
            "total_pending_count": data.get("kpis", {}).get("total_pending_count", 0),
        },
        "chart_hours": data.get("chart_hours", []),
        "today_values": data.get("today_values", []),
        "cumulative_values": data.get("cumulative_values", []),
        "last_day_values": data.get("last_day_values", []),
        "last_cumulative_values": data.get("last_cumulative_values", []),
        "history_log": data.get("history_log", []),
        "brands": brands,
        "brand": brand,
        "currency": currency,
        "available_currencies": available_currencies,
    })


    # return templates.TemplateResponse("pages/admin/dashboard.html", {
    #     "request": request,
    #     "nav_links": NAV_LINKS,
    #     "current_page": "Dashboard",
    #     "user": user
    # })

