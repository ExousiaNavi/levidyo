import json
import shutil
import base64
from fastapi import APIRouter, Request, HTTPException
from backend.core.templates import templates
from fastapi.responses import HTMLResponse
from backend.core.auth import NAV_LINKS_KYC, check_auth_kyc
from datetime import datetime
from pydantic import BaseModel
from pathlib import Path
from .kyc_data import generate_doc_types

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent  # <- adjust based on file depth
STATIC_DIR = BASE_DIR / "frontend" / "static"
UPLOAD_DIR = STATIC_DIR / "uploads" / "kyc"

class KYCRequest(BaseModel):
    user_id: str
    country: str
    documentType: str
    fullName: str
    birthdate: str
    address: str
    city: str
    postalCode: str
    idFront: str
    idBack: str
    selfie: str

# ---- Helper function ----
def save_base64_image(base64_data: str, folder: Path, filename: str) -> str:
    """Decode base64 image and save it to folder."""
    folder.mkdir(parents=True, exist_ok=True)

    if "," in base64_data:
        base64_data = base64_data.split(",")[1]

    file_path = folder / filename
    
    with open(file_path, "wb") as f:
        f.write(base64.b64decode(base64_data))
    
    return str(file_path)

def file_to_base64_with_prefix(path: Path) -> str:
    """Read a file and return base64 with PNG MIME prefix."""
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")
    
@router.get("/kyc/identification", response_class=HTMLResponse)
async def kyc_verification(request: Request):
    user = check_auth_kyc(request)
    kyc_status = user.get("user", {}).get("kyc_status", "not-verified")
    is_kyc_verified = (kyc_status == "verified")
    doc_types = generate_doc_types()

    if user:
        return templates.TemplateResponse("pages/kyc/verification.html", {
            "request": request,
            "user": user,
            "kyc_status": is_kyc_verified,
            "doc_types": doc_types,
            "nav_links": NAV_LINKS_KYC,
            "current_page": "Identification",
        })

@router.post("/kyc/submit-documents")
async def submit_kyc_documents(payload: KYCRequest):
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H")
        user_folder = UPLOAD_DIR / payload.user_id
        user_folder.mkdir(parents=True, exist_ok=True)

        # Save front and back as base64
        front_path = save_base64_image(payload.idFront, user_folder, f"front_{timestamp}.png")
        back_path = save_base64_image(payload.idBack, user_folder, f"back_{timestamp}.png")
        # selfie_path = save_base64_image(payload.selfie, user_folder, f"selfie_{timestamp}.png")

         # Handle selfie: move file if already uploaded
        if payload.selfie.startswith("/static/"):  
            selfie_source = BASE_DIR / "frontend" / payload.selfie.lstrip("/")
            selfie_path = user_folder / f"selfie_{timestamp}.png"
            shutil.move(selfie_source, selfie_path)  # ✅ Move instead of copy

        # Prepare JSON for 3rd party
        kyc_data = {
            "user_id": payload.user_id,
            "country": payload.country,
            "documentType": payload.documentType,
            "fullName": payload.fullName,
            "birthdate": payload.birthdate,
            "address": payload.address,
            "city": payload.city,
            "postalCode": payload.postalCode,
            "idFront": file_to_base64_with_prefix(front_path),
            "idBack": file_to_base64_with_prefix(back_path),  
            "selfie": file_to_base64_with_prefix(selfie_path)
        }

        print("🔎 KYC Submission Details:")
        print(json.dumps(payload.dict(), indent=2))

        return {
            "message": "KYC submitted successfully",
            "status": "under_review",
            "user_id": payload.user_id,
            "kyc_verification": kyc_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
