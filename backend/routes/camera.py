from fastapi import APIRouter, Request, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse,RedirectResponse
# from backend.core.firebase import auth as firebase_auth, db
from backend.core.templates import templates
from backend.core.auth import USERS #for demo purposes login
from backend.utils.stego_utils import encode_image,encode_text_image,decode_image
from backend.core.auth import check_auth, NAV_LINKS, NAV_LINKS_CRM
from datetime import timedelta, datetime
# import json
import cv2
import os
from pathlib import Path
import shutil
import random
import string
import uuid

# Get the real base directory from your main file logic
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # <- adjust based on file depth
STATIC_DIR = BASE_DIR / "frontend" / "static"
STATIC_DIR_LOGO = BASE_DIR / "frontend" / "static" / "logo" / "lg.png"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_ID_DIR = STATIC_DIR / "upload_ids"
ENCODED_DIR = STATIC_DIR / "encoded"
ENCODED_ID_DIR = STATIC_DIR / "encoded_id"
HAAR_CASCADE_PATH = STATIC_DIR / "haarcascades" / "haarcascade_frontalface_default.xml" 

# Make sure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ENCODED_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()

def generate_random_message(length=12):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

@router.get("/camera")
async def camera_page(request: Request):
        user = check_auth(request)
        if isinstance(user, RedirectResponse):
            return templates.TemplateResponse("pages/camera/index.html", {
                "request": request,
                "user": [],
                # "data": data,
                "nav_links": [],
                # "current_page": "Camera",
            })
        
        if user['role'] != 'crm':
            return templates.TemplateResponse("pages/camera/index.html", {
                "request": request,
                "user": user,
                # "data": data,
                "nav_links": NAV_LINKS,
                "current_page": "Camera",
            })
        elif user['role'] == 'crm':
            return templates.TemplateResponse("pages/camera/index.html", {
                "request": request,
                "user": user,
                # "data": data,
                "nav_links": NAV_LINKS_CRM,
                "current_page": "Camera",
            })

# id logic
@router.post("/verify-id")
async def verify_id(
    image: UploadFile = File(...),
    side: str = Form(...)  # "idFront" or "idBack"
):
    try:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"id_{side}_{timestamp}_{uuid.uuid4().hex}.png"
        save_path = UPLOAD_ID_DIR / filename

        # Save the original image
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        # Here you would add your ID verification logic
        # For example:
        verification_result = verify_id_image(str(save_path), side)

        if not verification_result["valid"]:
            return JSONResponse(
                status_code=400,
                content={
                    "valid": False,
                    "message": verification_result.get("message", "ID verification failed"),
                    "details": verification_result.get("details", {})
                }
            )

        # Generate secret code to embed
        code = generate_random_message(16)
        output_path = ENCODED_ID_DIR / filename
        # Encode 
        encode_text_image(str(save_path), str(output_path), code)

        return JSONResponse({
            "valid": True,
            "message": "ID verified successfully",
            "image_url": f"/static/encoded_id/{filename}",
            "filename": filename,
            "details": verification_result.get("details", {})
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "valid": False,
                "message": f"ID verification error: {str(e)}"
            }
        )


# Example verification function (you would implement your actual logic here)
def verify_id_image(image_path: str, side: str) -> dict:
    """
    Placeholder for actual ID verification logic
    Returns dict with at least {'valid': bool, 'message': str}
    """
    # Add your actual verification logic here
    # This might include:
    # - OCR to read ID information
    # - Template matching for ID type
    # - Security feature detection
    # - Front/back consistency checks
    
    return {
        "valid": True,  # Replace with actual verification
        "message": "Verification passed",
        "details": {
            "side": side,
            # Add any extracted information here
        }
    }

# face logic
@router.post("/upload-image")
async def upload_image(image: UploadFile, message: str = Form(...)):
    try:
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{timestamp}_{uuid.uuid4().hex}.png"
        input_path = UPLOAD_DIR / filename

        # Save original image
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        # Load saved image for face detection
        img = cv2.imread(str(input_path))
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        face_cascade = cv2.CascadeClassifier(HAAR_CASCADE_PATH)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

        if face_cascade.empty():
            raise IOError(f"Failed to load Haar cascade from {HAAR_CASCADE_PATH}")

        face_box = None
        if face_box is not None:
            # Use the largest face (assumes closer = larger area)
            face_box = max(faces, key=lambda box: box[2] * box[3])  # (x, y, w, h)

        # Generate secret code to embed
        code = generate_random_message(16)
        output_path = ENCODED_DIR / filename

        # Encode with watermark positioned based on face if found
        encode_image(str(input_path), str(output_path), code, str(STATIC_DIR_LOGO), face_box)

        return JSONResponse({
            "message": "Image encoded and saved successfully.",
            "image_url": f"/static/encoded/{filename}",
            "filename" : filename
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Encoding failed: {str(e)}"})


@router.delete("/delete-image")
async def delete_image(request: Request):
    try:
        data = await request.json()
        filename = data.get("filename")
        if not filename:
            return JSONResponse(status_code=400, content={"detail": "Filename is required"})

        input_path = UPLOAD_DIR / filename
        encoded_path = ENCODED_DIR / filename

        deleted_files = []
        for file_path in [input_path, encoded_path]:
            if file_path.exists():
                file_path.unlink()
                deleted_files.append(str(file_path))

        return JSONResponse({
            "message": "File(s) deleted successfully",
            "deleted": deleted_files
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})
    
@router.delete("/delete-image-id")
async def delete_image_id(request: Request):
    try:
        data = await request.json()
        filename = data.get("filename")
        if not filename:
            return JSONResponse(status_code=400, content={"detail": "Filename is required"})

        input_path = UPLOAD_ID_DIR / filename
        encoded_path = ENCODED_ID_DIR / filename

        deleted_files = []
        for file_path in [input_path, encoded_path]:
            if file_path.exists():
                file_path.unlink()
                deleted_files.append(str(file_path))

        return JSONResponse({
            "message": "File(s) deleted successfully",
            "deleted": deleted_files
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})
    

@router.get("/decode-image")
async def decode_image_from_file(filename: str):
    try:
        encoded_path = ENCODED_DIR / filename

        if not encoded_path.exists():
            raise HTTPException(status_code=404, detail="Encoded image not found.")

        decoded_text = decode_image(str(encoded_path))
        return JSONResponse({"message": decoded_text})
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Decoding failed: {str(e)}"})
    
@router.get("/list-encoded-images")
async def list_encoded_images():
    try:
        files = sorted(
            [
                f.name for f in ENCODED_DIR.iterdir()
                if f.is_file() and f.suffix.lower() in [".png", ".jpg", ".jpeg"]
            ],
            reverse=True  # Sort newest to oldest
        )
        return JSONResponse({
            "files": files,
            "total": len(files),
            "base_url": "/static/encoded/"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")