from fastapi import APIRouter, Request, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse,RedirectResponse
# from backend.core.firebase import auth as firebase_auth, db
from backend.core.templates import templates
from backend.core.auth import USERS #for demo purposes login
from backend.utils.stego_utils import encode_image,encode_id_image, encode_text_image,decode_image
from backend.core.auth import check_auth,check_auth_kyc, NAV_LINKS, NAV_LINKS_CRM
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
import base64
import traceback
# from matplotlib import pyplot as plt
# from pytesseract import Output

# Get the real base directory from your main file logic
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent  # <- adjust based on file depth
STATIC_DIR = BASE_DIR / "frontend" / "static"
STATIC_DIR_LOGO = BASE_DIR / "frontend" / "static" / "logo" / "lg.png"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_ID_DIR = STATIC_DIR / "upload_ids"
ENCODED_DIR = STATIC_DIR / "encoded"
ENCODED_ID_DIR = STATIC_DIR / "encoded_id"
HAAR_CASCADE_PATH = STATIC_DIR / "haarcascades" / "haarcascade_frontalface_default.xml" 
CARD_TEMPLATE = STATIC_DIR / "templates" / "card1.png" 

# Make sure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ENCODED_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()

def generate_random_message(length=12):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def detect_card_with_box(image_path, template_path="card_template.png"):
    """Detects cards using template matching with error handling"""
    try:
        # Load images in grayscale
        original_img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        template = cv2.imread(template_path, cv2.IMREAD_GRAYSCALE)
        
        if original_img is None or template is None:
            return {"valid": False, "message": "Could not read image(s)"}

        # Create a color version for drawing
        detected_img = cv2.cvtColor(original_img, cv2.COLOR_GRAY2BGR)
        h, w = template.shape

        # Try multiple matching methods
        methods = [cv2.TM_CCOEFF_NORMED, cv2.TM_CCORR_NORMED]  # Best methods first
        
        best_match = None
        for method in methods:
            try:
                res = cv2.matchTemplate(original_img, template, method)
                _, max_val, _, max_loc = cv2.minMaxLoc(res)
                
                # Keep the best match across methods
                if best_match is None or max_val > best_match[1]:
                    best_match = (max_loc, max_val, method)
            except Exception as e:
                continue  # Skip if method fails

        # Process results
        if best_match and best_match[1] > 0.7:  # Confidence threshold
            max_loc, max_val, method = best_match
            top_left = max_loc
            bottom_right = (top_left[0] + w, top_left[1] + h)
            
            # Draw green bounding box
            cv2.rectangle(detected_img, top_left, bottom_right, (0, 255, 0), 3)
            cv2.putText(detected_img, f"Card {max_val:.2f}", (top_left[0], top_left[1]-10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            output_path = image_path.replace(".", "_detected.")
            cv2.imwrite(output_path, detected_img)
            
            return {
                "valid": True,
                "message": "Card detected",
                "output_image": output_path,
                "details": {
                    "method": method,
                    "confidence": float(max_val),
                    "location": {
                        "x": int(top_left[0]),
                        "y": int(top_left[1]),
                        "width": w,
                        "height": h
                    }
                }
            }
        else:
            cv2.putText(detected_img, "No Card Detected", (20, 40),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            output_path = image_path.replace(".", "_detected.")
            cv2.imwrite(output_path, detected_img)
            
            return {
                "valid": False,
                "message": "No card detected",
                "output_image": output_path
            }

    except Exception as e:
        return {"valid": False, "message": f"Error: {str(e)}"}
    
@router.get("/")
async def kyc_page(request: Request):
        user = check_auth_kyc(request)
        # us_player = user.get('roles', {}).get('is_player', False)  # Default to False if not found
        # print("=====================================================")
        # print(us_player)
        # print("=====================================================")
        
        #new pathche no authentication
        return RedirectResponse(url="/kyc/identification", status_code=303)
        # if not user:
        #     print("No session → show auth page")
        #     return templates.TemplateResponse("pages/kyc/auth.html", {
        #         "request": request,
        #         "user": [],
        #         "nav_links": [],
        #         "current_page": "auth",
        #     })

        # else:
        #     # ✅ Redirect authenticated users to dashboard
        #     return RedirectResponse(url="/kyc/identification", status_code=303)


        # COMMENTED FOR NOW NOT NEEDED
        # if isinstance(user, RedirectResponse):
        #     return templates.TemplateResponse("pages/kyc/index.html", {
        #         "request": request,
        #         "user": [],
        #         # "data": data,
        #         "nav_links": [],
        #         # "current_page": "Camera",
        #     })
        
        # if user['role'] != 'crm':
        #     return templates.TemplateResponse("pages/kyc/index.html", {
        #         "request": request,
        #         "user": user,
        #         # "data": data,
        #         "nav_links": NAV_LINKS,
        #         "current_page": "Camera",
        #     })
        # elif user['role'] == 'crm':
        #     return templates.TemplateResponse("pages/kyc/index.html", {
        #         "request": request,
        #         "user": user,
        #         # "data": data,
        #         "nav_links": NAV_LINKS_CRM,
        #         "current_page": "Camera",
        #     })








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
        verification_result = detect_card_with_box(str(save_path), CARD_TEMPLATE)
        print(verification_result)
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


# face logic (clean version)
@router.post("/upload-image")
async def upload_image(image: UploadFile, message: str = Form(...)):
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{timestamp}_{uuid.uuid4().hex}.jpg"  # Use JPG extension
        input_path = UPLOAD_DIR / "bin" / filename

        # --- Step 1: Save the uploaded image with original quality ---
        image_data = await image.read()
        with open(input_path, "wb") as buffer:
            buffer.write(image_data)

        # --- Step 2: Convert the original image to Base64 WITHOUT re-encoding ---
        original_base64 = base64.b64encode(image_data).decode("utf-8")
        original_base64_data = f"data:image/jpeg;base64,{original_base64}"

        # --- Step 3: Read image with OpenCV preserving quality ---
        img_array = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            # Fallback: try reading from file
            img = cv2.imread(str(input_path))
            if img is None:
                raise ValueError(f"Failed to decode image")

        # --- Step 4: Detect face ---
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(HAAR_CASCADE_PATH)
        if face_cascade.empty():
            raise IOError(f"Failed to load Haar cascade from {HAAR_CASCADE_PATH}")

        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        face_box = max(faces, key=lambda box: box[2] * box[3]) if len(faces) > 0 else None

        # --- Step 5: Generate secret code and encode image ---
        code = generate_random_message(16)
        face_validated = encode_image(
            str(input_path),
            str(input_path),
            code,
            str(STATIC_DIR_LOGO),
            face_box
        )

        # --- Step 6: Read processed image with HIGH QUALITY settings ---
        processed_img = cv2.imread(str(input_path))
        if processed_img is None:
            raise ValueError(f"Processed image not found at {input_path}")
        print("PASSEDD STEP 6")
        # Use HIGH quality JPEG encoding (95% quality)
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 100]
        _, buffer = cv2.imencode('.jpg', processed_img, encode_params)
        processed_base64 = base64.b64encode(buffer).decode('utf-8')
        processed_base64_data = f"data:image/jpeg;base64,{processed_base64}"
        print("PASSEDD STEP 7")
        # --- Step 7: Clean up ---
        if input_path.exists():
            input_path.unlink()

        # --- Step 8: Return both Base64 images ---
        return JSONResponse({
            "face_validated": face_validated,
            "message": "Image encoded and saved successfully.",
            "filename": filename,
            "original_image_base64": original_base64_data,
            "image_base64": processed_base64_data
        })

    except Exception as e:
        tb = traceback.format_exc()
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Encoding failed: {str(e)}",
                "trace": tb
            }
        )


@router.post("/upload-image-id")
async def upload_image_id(data: dict):
    try:
        # ---------------------------------
        # 1) Extract incoming data
        # ---------------------------------
        image_base64 = data.get("image")
        side = data.get("side")

        # Extract raw base64 part
        header, encoded = image_base64.split(",", 1)
        image_bytes = base64.b64decode(encoded)

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_name = f"{timestamp}_{uuid.uuid4().hex}.jpg"

        # Temp file paths
        input_path = UPLOAD_DIR / "bin" / f"orig_{unique_name}"
        output_path = UPLOAD_DIR / "bin" / f"wm_{unique_name}"

        # ---------------------------------
        # 2) Save original temp image
        # ---------------------------------
        with open(input_path, "wb") as f:
            f.write(image_bytes)

        # ---------------------------------
        # 3) Apply watermark + LSB encoding
        # ---------------------------------
        encode_id_image(
            input_path=str(input_path),
            output_path=str(output_path),
            secret_text="secure_text_here",  # you can generate session hash
            watermark_path=str(STATIC_DIR_LOGO)
        )

        # ---------------------------------
        # 4) Convert both output images to base64
        # ---------------------------------
        with open(input_path, "rb") as f:
            original_b64 = base64.b64encode(f.read()).decode("utf-8")

        with open(output_path, "rb") as f:
            watermarked_b64 = base64.b64encode(f.read()).decode("utf-8")

        # Put data URLs
        original_data_url = f"data:image/jpeg;base64,{original_b64}"
        watermarked_data_url = f"data:image/jpeg;base64,{watermarked_b64}"

        # ---------------------------------
        # 5) Delete temporary files
        # ---------------------------------
        try:
            if input_path.exists():
                os.remove(input_path)
            if output_path.exists():
                os.remove(output_path)

        except Exception as cleanup_err:
            print("⚠ Cleanup failed:", cleanup_err)

        # ---------------------------------
        # 6) Return JSON response
        # ---------------------------------
        return {
            "status": "success",
            "side": side,
            "base64_original": original_data_url,
            "base64_watermarked": watermarked_data_url
        }

    except Exception as e:
        tb = traceback.format_exc()
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Processing failed: {str(e)}",
                "trace": tb
            }
        )

# face logic original
# @router.post("/upload-image")
# async def upload_image(image: UploadFile, message: str = Form(...)):
#     try:
        
#         timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
#         filename = f"{timestamp}_{uuid.uuid4().hex}.png"
#         input_path = UPLOAD_DIR / "bin" / filename

#         # Save original image
#         with open(input_path, "wb") as buffer:
#             shutil.copyfileobj(image.file, buffer)

#         # Load saved image for face detection
#         img = cv2.imread(str(input_path))
#         gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

#         face_cascade = cv2.CascadeClassifier(HAAR_CASCADE_PATH)
#         faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

#         if face_cascade.empty():
#             raise IOError(f"Failed to load Haar cascade from {HAAR_CASCADE_PATH}")

#         face_box = None
#         if face_box is not None:
#             # Use the largest face (assumes closer = larger area)
#             face_box = max(faces, key=lambda box: box[2] * box[3])  # (x, y, w, h)

#         # Generate secret code to embed
#         code = generate_random_message(16)
#         output_path = ENCODED_DIR / filename

#         # Encode with watermark positioned based on face if found
#         face_validated = encode_image(str(input_path), str(input_path), code, str(STATIC_DIR_LOGO), face_box, debug=False)

#         # Convert processed image to Base64 JPEG
#         processed_img = cv2.imread(str(input_path))
#         _, buffer = cv2.imencode('.jpg', processed_img)  # encode as JPEG
#         img_base64 = base64.b64encode(buffer).decode('utf-8')
#         base64_data = f"data:image/jpeg;base64,{img_base64}"

#         # Delete the original image before returning
#         if input_path.exists():
#             input_path.unlink()

#         return JSONResponse({
#             "face_validated": face_validated,
#             "message": "Image encoded and saved successfully.",
#             "image_url": f"/static/uploads/bin/{filename}",# processed image storage temporary
#             "filename" : filename,
#             "image_base64": base64_data
#         })

#     except Exception as e:
#         return JSONResponse(status_code=500, content={"detail": f"Encoding failed: {str(e)}"})


@router.delete("/delete-image")
async def delete_image(request: Request):
    try:
        data = await request.json()
        filename = data.get("filename")
        if not filename:
            return JSONResponse(status_code=400, content={"detail": "Filename is required"})

        input_path = UPLOAD_DIR / "bin" / filename
        # encoded_path = ENCODED_DIR / filename

        deleted_files = []
        for file_path in [input_path]:
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