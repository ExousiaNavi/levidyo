from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.config import settings
from backend.routes import auth, dashboard, deposit, profile, users, amount, context, empty,camera

# crm routes
from backend.routes.crm import crm_dashboard
import backend.core.firebase  # auto-runs initialization
from backend.core.whitelist import restrict_ip_middleware  # available ip

from starlette.staticfiles import StaticFiles
from starlette.types import Scope

class NoCacheStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope: Scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
app = FastAPI(title=settings.APP_NAME)

# Register IP restriction middleware
# app.middleware("http")(restrict_ip_middleware)

# Static & Template paths
BASE_DIR = Path(__file__).resolve().parent.parent
app.mount("/static", NoCacheStaticFiles(directory=BASE_DIR / "frontend/static"), name="static")
# app.mount("/uploads", StaticFiles(directory=BASE_DIR / "uploads"), name="uploads")

# Include routers
app.include_router(context.router)
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(deposit.router)
app.include_router(profile.router)
app.include_router(users.router)
app.include_router(amount.router)

# camera routes
app.include_router(camera.router)

# crm routes
app.include_router(crm_dashboard.router)

# Empty route
app.include_router(empty.router)

@app.get("/.well-known/{path:path}", include_in_schema=False)
async def ignore_well_known():
    return {"detail": "Not Found"}
