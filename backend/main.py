from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path

from backend.config import settings
from backend.routes import auth, dashboard, deposit, profile, users, amount

import backend.core.firebase  # auto-runs initialization

app = FastAPI(title=settings.APP_NAME)

# Adjusted path (based on your real structure)
BASE_DIR = Path(__file__).resolve().parent.parent

# Mount static and templates
app.mount("/static", StaticFiles(directory=BASE_DIR / "frontend/static"), name="static")
# templates = Jinja2Templates(directory=BASE_DIR / "frontend/templates")

# Register route modules
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(deposit.router)
app.include_router(profile.router)
app.include_router(users.router)
app.include_router(amount.router)

@app.get("/.well-known/{path:path}", include_in_schema=False)
async def ignore_well_known():
    return {"detail": "Not Found"}
