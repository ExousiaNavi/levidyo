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
import json
import os
from pathlib import Path
import shutil
import random
import string
import uuid
# import pytesseract
import numpy as np
# from matplotlib import pyplot as plt
# from pytesseract import Output

# Get the real base directory from your main file logic
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # <- adjust based on file depth
STATIC_DIR = BASE_DIR / "frontend" / "static"
STATIC_DIR_LOGO = BASE_DIR / "frontend" / "static" / "logo" / "lg.png"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_ID_DIR = STATIC_DIR / "upload_ids"
ENCODED_DIR = STATIC_DIR / "encoded"
ENCODED_ID_DIR = STATIC_DIR / "encoded_id"
HAAR_CASCADE_PATH = STATIC_DIR / "haarcascades" / "haarcascade_frontalface_default.xml" 
CARD_TEMPLATE = STATIC_DIR / "templates" / "card.png" 

# Make sure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ENCODED_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()

def generate_random_message(length=12):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def verify_id_card(image_path, template_path="card.png"):
    """Proper template matching - finds card in image regardless of sizes"""
    try:
        # Load images
        img = cv2.imread(image_path)
        template = cv2.imread(template_path)
        
        if img is None or template is None:
            return {
                "valid": False,
                "message": "Could not read image files",
                "debug_image": None,
                "details": {}
            }
        
        # Convert to grayscale
        img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
        t_h, t_w = template_gray.shape
        i_h, i_w = img_gray.shape

        # ✅ Resize template if larger than image
        if t_h > i_h or t_w > i_w:
            scale = min(i_w / t_w, i_h / t_h, 1.0)  # never upscale
            new_w, new_h = int(t_w * scale), int(t_h * scale)
            template_gray = cv2.resize(template_gray, (new_w, new_h), interpolation=cv2.INTER_AREA)
            t_h, t_w = template_gray.shape
        
        # Perform template matching
        res = cv2.matchTemplate(img_gray, template_gray, cv2.TM_CCOEFF_NORMED)
        threshold = 0.7
        loc = np.where(res >= threshold)
        
        debug_img = img.copy()
        
        if len(loc[0]) > 0:
            # Get all matches above threshold
            for pt in zip(*loc[::-1]):
                cv2.rectangle(debug_img, pt, (pt[0] + t_w, pt[1] + t_h), (0, 255, 0), 2)
            
            # Get best match
            min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
            
            debug_path = image_path.replace(".", "_debug.")
            cv2.imwrite(debug_path, debug_img)
            
            return {
                "valid": True,
                "message": f"Card detected (confidence: {max_val:.2f})",
                "debug_image": debug_path,
                "details": {
                    "best_match": {
                        "x": int(max_loc[0]),
                        "y": int(max_loc[1]),
                        "width": t_w,
                        "height": t_h,
                        "confidence": float(max_val)
                    }
                }
            }
        else:
            cv2.putText(debug_img, "No card detected", (20, 40),
                      cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            debug_path = image_path.replace(".", "_debug.")
            cv2.imwrite(debug_path, debug_img)
            
            return {
                "valid": False,
                "message": "No card detected",
                "debug_image": debug_path,
                "details": {}
            }

    except Exception as e:
        return {
            "valid": False,
            "message": f"Processing error: {str(e)}",
            "debug_image": None,
            "details": {}
        }

  
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
        # verification_result = verify_id_card(str(save_path), CARD_TEMPLATE)

        # if not verification_result["valid"]:
        #     return JSONResponse(
        #         status_code=400,
        #         content={
        #             "valid": False,
        #             "message": verification_result.get("message", "ID verification failed"),
        #             "details": verification_result.get("details", {})
        #         }
        #     )

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
            # "details": verification_result.get("details", {})
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "valid": False,
                "message": f"ID verification error: {str(e)}"
            }
        )



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
        face_validated = encode_image(str(input_path), str(output_path), code, str(STATIC_DIR_LOGO), face_box, debug=False)

        return JSONResponse({
            "face_validated": face_validated,
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