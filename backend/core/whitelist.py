from fastapi import Request, status
from fastapi.responses import JSONResponse
from dotenv import dotenv_values
from pathlib import Path
import ast

# Load .env
# Load .env
env = dotenv_values(Path(__file__).resolve().parent.parent / ".env")

# Parse allowed IPs
try:
    # allowed_ips = ast.literal_eval(env.get("ALLOWED_IPS", "[]"))
    allowed_ips = ["157.245.100.97"]
    print("Raw ALLOWED_IPS from .env:", allowed_ips)
except Exception:
    allowed_ips = []
    print(allowed_ips)

async def restrict_ip_middleware(request: Request, call_next):
    client_ip = request.client.host

    if client_ip not in allowed_ips:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Access denied"}
        )

    return await call_next(request)
