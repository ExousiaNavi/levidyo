import json
import shutil
import base64
import cv2
import os
import numpy as np
from fastapi import APIRouter, Request, HTTPException
from backend.core.templates import templates
from fastapi.responses import HTMLResponse, JSONResponse
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
    # Removing all authentication module
    # user = check_auth_kyc(request)
    # kyc_status = user.get("user", {}).get("kyc_status", "not-verified")
    # is_kyc_verified = (kyc_status == "verified")
    doc_types = generate_doc_types()

    return templates.TemplateResponse("pages/kyc/verification-new.html", {
                "request": request,
                "user": None,
                "kyc_status": False,
                "doc_types": doc_types,
                "nav_links": NAV_LINKS_KYC,
                "current_page": "Identification",
            }) 

    # if user:
    #     return templates.TemplateResponse("pages/kyc/verification.html", {
    #         "request": request,
    #         "user": user,
    #         "kyc_status": is_kyc_verified,
    #         "doc_types": doc_types,
    #         "nav_links": NAV_LINKS_KYC,
    #         "current_page": "Identification",
    #     }) 

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
        
        # Optionally, save to a file
        with open('kyc_data.json', 'w') as json_file:
            json.dump(kyc_data, json_file, indent=2)

        print("✅ KYC data has been saved to 'kyc_data.json'")

        # ✅ Clear the directory after data is prepared
        shutil.rmtree(user_folder)
        print(f"🗑️ Cleared folder: {user_folder}")


        return {
            "message": "KYC submitted successfully",
            "status": "under_review",
            "user_id": payload.user_id,
            "kyc_verification": kyc_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@router.post("/kyc/document")
async def kyc_document(request: Request):
    try:
        payload = await request.json()
        print(payload)
        user_folder = "user_uploads"  # Or your existing user folder logic
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create debug folder if it doesn't exist
        debug_folder = os.path.join(user_folder, "debug")
        os.makedirs(debug_folder, exist_ok=True)
        
        # Process front image
        front_result = None
        if payload["side"] == "idFront":
            front_result, front_debug_img = validate_id_centering_with_debug(
                payload['image'], 
                "front"
            )
            # Commented out debug image saving
            # front_debug_path = os.path.join(debug_folder, f"front_debug_{timestamp}.png")
            # cv2.imwrite(front_debug_path, front_debug_img)
        
        # Process back image
        back_result = None
        if payload["side"] == "idBack":
            back_result, back_debug_img = validate_id_centering_with_debug(
                payload['image'], 
                "back"
            )
            # Commented out debug image saving
            # back_debug_path = os.path.join(debug_folder, f"back_debug_{timestamp}.png")
            # cv2.imwrite(back_debug_path, back_debug_img)
        
        # Check results
        errors = []
        if front_result and not front_result.get('is_centered', False):
            errors.append("Front document is not properly centered")
        if back_result and not back_result.get('is_centered', False):
            errors.append("Back document is not properly centered")
        
        if errors:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "message": " ".join(errors),
                    "details": {
                        "front": front_result,
                        "back": back_result
                    }
                }
            )
        
        return {
            "status": "success",
            "message": "Documents validated",
            "details": {
                "front": front_result,
                "back": back_result
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def validate_id_centering_with_debug(base64_image, image_type, center_threshold=0.1, min_aspect_ratio=1.3, max_aspect_ratio=2.0):
    """Validate ID-like object centering and return result with debug image"""
    try:
        # # Clean the base64 string if it contains headers
        # if isinstance(base64_image, str):
        #     if 'base64,' in base64_image:
        #         base64_image = base64_image.split('base64,')[1]
        #     base64_image = base64_image.strip()
            
        #     if not base64_image:
        #         raise ValueError("Empty base64 string provided")
            
        #     # Ensure proper padding
        #     padding = len(base64_image) % 4
        #     if padding:
        #         base64_image += '=' * (4 - padding)
        
        # # Decode image
        # image_data = base64.b64decode(base64_image)
        # nparr = np.frombuffer(image_data, np.uint8)
        # img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # if img is None:
        #     raise ValueError("Failed to decode image - possibly invalid or corrupted image data")
        
        # debug_img = img.copy()
        # height, width = img.shape[:2]
        # image_center = (width/2, height/2)
        
        # # Process image
        # gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        #  # Process image with different approach
        # gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # # Use adaptive thresholding instead of global threshold
        # thresh = cv2.adaptiveThreshold(gray, 255, 
        #                              cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        #                              cv2.THRESH_BINARY_INV, 11, 2)
        
        # # Add morphological operations to enhance ID features
        # kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5,5))
        # morph = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        # morph = cv2.morphologyEx(morph, cv2.MORPH_OPEN, kernel)
        
        # # Find contours with hierarchy to better detect document structure
        # contours, hierarchy = cv2.findContours(morph, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        
        # if not contours:
        #     raise ValueError("No objects detected in image")
        
        # # Filter contours to find ID-like objects (rectangular with proper aspect ratio)
        # document_contours = []
        # for i, contour in enumerate(contours):
        #     # Check if this contour has children (indicating potential document with internal features)
        #     if hierarchy[0][i][2] != -1:  # Has child contours
        #         x, y, w, h = cv2.boundingRect(contour)
        #         aspect_ratio = float(w)/h
                
        #         # Less strict size requirements but still reasonable
        #         if (min_aspect_ratio <= aspect_ratio <= max_aspect_ratio and
        #             w > width/4 and h > height/4):  # At least 25% of image dimensions
        #             document_contours.append(contour)
        
        # # If no document contours found, try alternative approach
        # if not document_contours:
        #     # Find all large enough contours
        #     large_contours = []
        #     for contour in contours:
        #         x, y, w, h = cv2.boundingRect(contour)
        #         if w > width/3 and h > height/3:
        #             large_contours.append(contour)
            
        #     # If exactly one large contour found, use it
        #     if len(large_contours) == 1:
        #         document_contours = large_contours

        # if not document_contours:
        #     raise ValueError("No ID-like objects detected (wrong aspect ratio)")
        
        # # Get largest ID-like contour
        # largest_contour = max(document_contours, key=cv2.contourArea)
        # x, y, w, h = cv2.boundingRect(largest_contour)
        # # Final validation
        # if (w * h) < (width * height * 0.1):  # Less than 10% of image area
        #     raise ValueError("Detected object is too small")
        
        # object_center = (x + w/2, y + h/2)
        
        # # Calculate deviation
        # x_deviation = abs(object_center[0] - image_center[0]) / width
        # y_deviation = abs(object_center[1] - image_center[1]) / height
        # max_deviation = max(x_deviation, y_deviation)
        
        # # Draw visualization elements
        # cv2.rectangle(debug_img, (x, y), (x+w, y+h), (0, 255, 0), 2)
        # cv2.circle(debug_img, (int(object_center[0]), int(object_center[1])), 5, (255, 0, 0), -1)
        # cv2.circle(debug_img, (int(image_center[0]), int(image_center[1])), 5, (0, 0, 255), -1)
        
        # # Add text annotations
        # font = cv2.FONT_HERSHEY_SIMPLEX
        # cv2.putText(debug_img, f"X Dev: {x_deviation:.2f}", (10, 30), font, 0.7, (255, 255, 255), 2)
        # cv2.putText(debug_img, f"Y Dev: {y_deviation:.2f}", (10, 60), font, 0.7, (255, 255, 255), 2)
        # cv2.putText(debug_img, f"Max Dev: {max_deviation:.2f}", (10, 90), font, 0.7, (255, 255, 255), 2)
        
        # is_centered = max_deviation <= center_threshold
        # status = "CENTERED" if is_centered else "NOT CENTERED"
        # color = (0, 255, 0) if is_centered else (0, 0, 255)
        # cv2.putText(debug_img, status, (width-200, 30), font, 0.7, color, 2)
        
        # # Enhanced debug visualization
        # cv2.drawContours(debug_img, document_contours, -1, (0,255,255), 2)  # All potential docs in yellow
        # cv2.rectangle(debug_img, (x,y), (x+w,y+h), (0,255,0), 3)  # Selected doc in green

        # return {
        #     "is_centered": is_centered,
        #     "max_deviation": float(max_deviation),
        #     "threshold": float(center_threshold),
        #     "object_center": {"x": float(object_center[0]), "y": float(object_center[1])},
        #     "image_center": {"x": float(image_center[0]), "y": float(image_center[1])},
        #     "bounding_box": {"x": x, "y": y, "width": w, "height": h},
        #     "object_type": "ID-like"  # Indicate we found an ID-like object
        # }, debug_img

        return {
            "is_centered": True,
            "max_deviation": 0.0,
            "threshold": 0.0,
            "object_center": {"x": 0.0, "y": 0.0},
            "image_center": {"x": 0.0, "y": 0.0},
            "bounding_box": {"x": 0, "y": 0, "width": 0, "height": 0},
            "object_type": "No Validation for this version."  # Indicate we found an ID-like object
        }, "no debug image for this version"
        
    except Exception as e:
        # error_img = np.zeros((300, 500, 3), dtype=np.uint8)
        # cv2.putText(error_img, f"Error processing {image_type}:", (10, 30), 
        #            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        # cv2.putText(error_img, str(e), (10, 70), 
        #            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        
        return {
            "is_centered": False,
            "error": str(e)
        }, "no debug image for this version"