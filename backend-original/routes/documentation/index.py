import json
from fastapi import APIRouter, Request, Query
from backend.core.templates import templates
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from backend.core.auth import NAV_LINKS_KYC
# from datetime import datetime, timezone
# from typing import Optional
from backend.core.auth import check_auth_kyc
router = APIRouter()

@router.get("/documentation", response_class=HTMLResponse)
async def index(request: Request):
        return templates.TemplateResponse("pages/documentation/index.html", {
            "request": request,
        })
   
