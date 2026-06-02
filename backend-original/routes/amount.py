from fastapi import APIRouter, Request, Form, HTTPException
from fastapi.responses import JSONResponse
from backend.core.firebase import db
from backend.core.auth import check_auth, NAV_LINKS

router = APIRouter()

@router.get("/amount/target")
async def get_target():
    doc = db.collection("deposit").document("target_dp").get()
    if doc.exists:
        return {"amount": doc.to_dict().get("dp_amount", 0)}
    return {"amount": 0}

@router.post("/amount/target")
async def update_target_api(request: Request, amount: int = Form(...)):
    user = check_auth(request)

    if user["role"].lower() not in ["admin", "super"]:
        return JSONResponse({"success": False, "message": "Unauthorized"}, status_code=403)

    db.collection("deposit").document("target_dp").set({"dp_amount": amount})
    return {"success": True, "message": "Target amount updated", "amount": amount}