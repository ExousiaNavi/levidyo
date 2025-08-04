from fastapi import APIRouter, Request

router = APIRouter()

@router.post("/submit-verification")
async def submit_verification(request: Request):
    data = await request.json()
    face = data.get("face")
    front = data.get("front")
    back = data.get("back")
    username = data.get("username")

    # TODO: Save or process data
    print("Received data:", username, face, front, back)

    return {"success": True, "message": "Verification submitted successfully"}
