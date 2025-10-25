
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.config import settings
from backend.routes import context, empty,username, verification
from backend.routes.kyc import auth_kyc, kyc, kyc_dashboard, kyc_verification, kyc_verified

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
app.include_router(username.router)
app.include_router(verification.router)

# KYC routes
app.include_router(kyc.router)
app.include_router(auth_kyc.router)
app.include_router(kyc_dashboard.router)
app.include_router(kyc_verification.router)
app.include_router(kyc_verified.router)


# Empty route
app.include_router(empty.router)

@app.get("/.well-known/{path:path}", include_in_schema=False)
async def ignore_well_known():
    return {"detail": "Not Found"}
