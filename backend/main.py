from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.config import settings
from backend.routes import auth, dashboard, deposit, profile, users, amount

import backend.core.firebase  # auto-runs initialization
from backend.core.whitelist import restrict_ip_middleware  # available ip

app = FastAPI(title=settings.APP_NAME)

# Register IP restriction middleware
# app.middleware("http")(restrict_ip_middleware)

# Static & Template paths
BASE_DIR = Path(__file__).resolve().parent.parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "frontend/static"), name="static")

# Include routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(deposit.router)
app.include_router(profile.router)
app.include_router(users.router)
app.include_router(amount.router)

@app.get("/.well-known/{path:path}", include_in_schema=False)
async def ignore_well_known():
    return {"detail": "Not Found"}
