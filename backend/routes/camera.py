from fastapi import APIRouter, Request, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
# from backend.core.firebase import auth as firebase_auth, db
from backend.core.templates import templates
from backend.core.auth import USERS #for demo purposes login
from backend.utils.stego_utils import encode_image,decode_image
from datetime import timedelta, datetime
# import json
import os
from pathlib import Path
import shutil
import random
import string
import uuid

# Get the real base directory from your main file logic
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # <- adjust based on file depth
STATIC_DIR = BASE_DIR / "frontend" / "static"

UPLOAD_DIR = STATIC_DIR / "uploads"
ENCODED_DIR = STATIC_DIR / "encoded"

# Make sure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ENCODED_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()

def generate_random_message(length=12):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

@router.get("/camera")
async def camera_page(request: Request):
    
        return templates.TemplateResponse("pages/camera.html", {
            "request": request,
            "user": None,
            "nav_links": [],
        })

@router.post("/upload-image")
async def upload_image(image: UploadFile, message: str = Form(...)):
    try:
        filename = f"{uuid.uuid4().hex}.png"
        input_path = UPLOAD_DIR / filename
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

         # Generate a random message
        random_message = generate_random_message(16)

        output_path = ENCODED_DIR / filename
        encode_image(str(input_path), str(output_path), random_message)

        return JSONResponse({
            "message": "Image encoded and saved successfully.",
            "image_url": f"/static/encoded/{filename}"
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Encoding failed: {str(e)}"})

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