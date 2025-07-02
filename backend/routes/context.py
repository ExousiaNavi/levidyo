from fastapi.responses import RedirectResponse
from fastapi import APIRouter, Request, Query
from backend.core.auth import check_auth

router = APIRouter()

@router.get("/set-dashboard-context")
async def set_dashboard_context(request: Request, sub: str = Query(...), name: str = Query(...)):
    user = check_auth(request)
    if isinstance(user, RedirectResponse):
        print("not authenticated...")
        return user  # ⛔️ Not logged in, redirect to login

    # ✅ Authenticated — allow setting cookies
    response = RedirectResponse(url="/dashboard")
    response.set_cookie("sub", sub)
    response.set_cookie("name", name)
    return response
