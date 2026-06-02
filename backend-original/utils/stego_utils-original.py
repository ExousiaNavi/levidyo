from datetime import datetime
import cv2
import numpy as np

def encode_image(input_path: str, output_path: str, secret_text: str,
                 watermark_path="watermark.png", face_box=None, debug=False):
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError("Invalid input image")

    h, w = img.shape[:2]
    
    # Create debug image if in debug mode
    debug_img = img.copy() if debug else None

    # Step 1: Add datetime text watermark
    watermark_text = datetime.now().strftime('%Y-%m-%d %H:%M')
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.5
    thickness = 1
    color = (255, 255, 255)
    text_size = cv2.getTextSize(watermark_text, font, scale, thickness)[0]
    x_text = w - text_size[0] - 10
    y_text = h - 10
    cv2.putText(img, watermark_text, (x_text, y_text), font, scale, color, thickness)
    
    if debug:
        cv2.putText(debug_img, watermark_text, (x_text, y_text), font, scale, (0, 0, 255), thickness)

    # Step 2: Load watermark image
    watermark = cv2.imread(watermark_path, cv2.IMREAD_UNCHANGED)
    if watermark is None:
        raise ValueError("Invalid watermark image")

    wm_h, wm_w = watermark.shape[:2]

    # Step 3: Resize watermark proportionally (max 25% of image height or 40% of face width)
    target_height = min(h * 0.25, w * 0.4)  # More dynamic sizing
    scale_factor = target_height / wm_h
    watermark = cv2.resize(watermark, (int(wm_w * scale_factor), int(wm_h * scale_factor)))
    wm_h, wm_w = watermark.shape[:2]

    # Step 4: Improved face detection and watermark placement
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Improved face detection parameters to reduce false positives
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.05,  # Reduced from 1.1 to be more conservative
        minNeighbors=6,    # Increased from 4 to require more evidence
        minSize=(int(w/8), int(h/8))  # Minimum face size (1/8th of image)
    )

    # Filter faces to remove small detections (likely ears)
    min_face_area = (w * h) * 0.02  # At least 2% of image area
    valid_faces = []
    for (x, y, fw, fh) in faces:
        face_area = fw * fh
        if face_area >= min_face_area:
            valid_faces.append((x, y, fw, fh))

    if debug:
        for (x, y, fw, fh) in valid_faces:
            cv2.rectangle(debug_img, (x, y), (x+fw, y+fh), (0, 255, 0), 2)
            cv2.putText(debug_img, f"Face: {fw}x{fh}", (x, y-10), font, 0.5, (0, 255, 0), 1)

    found_face = False
    if len(valid_faces) > 0:
        # Select face closest to center of image (likely main subject)
        found_face = True
        image_center = (w//2, h//2)
        def distance_to_center(face):
            x, y, fw, fh = face
            face_center = (x + fw//2, y + fh//2)
            return ((face_center[0] - image_center[0])**2 + 
                    (face_center[1] - image_center[1])**2)
        
        main_face = min(valid_faces, key=distance_to_center)
        x, y, fw, fh = main_face
        
        # Calculate dynamic vertical position
        margin = int(fh * 0.70)  # 30% of face height as margin
        y_wm = y + fh + margin
        
        # Horizontal positioning - center relative to face with bounds checking
        x_wm = x + (fw - wm_w) // 2
        x_wm = max(0, min(x_wm, w - wm_w))  # Ensure within image bounds
        
        # Ensure watermark doesn't overlap with timestamp
        if x_wm + wm_w > x_text - 10:
            x_wm = x_text - wm_w - 10
        
        if debug:
            # Draw face landmarks for better visualization
            cv2.line(debug_img, (x, y + fh), (x + fw, y + fh), (255, 0, 0), 2)  # Chin line
            cv2.circle(debug_img, (x + fw//2, y + fh), 5, (0, 255, 255), -1)  # Chin center
            cv2.putText(debug_img, f"Margin: {margin}px", (x + fw//2 - 30, y + fh + 20), 
                       font, 0.4, (255, 255, 0), 1)
            
        # Adjust if watermark would go below image
        if y_wm + wm_h > h:
            y_wm = h - wm_h - 20
            if debug:
                print(f"Adjusting watermark position to stay within image (y={y_wm})")
    else:
        found_face = False
        # Default position when no valid faces detected
        x_wm = (w - wm_w) // 2
        y_wm = h - wm_h - int(h * 0.05)  # 5% from bottom
        if debug:
            print("No valid faces detected - using dynamic bottom positioning")

    # Final boundary checks
    x_wm = max(0, min(x_wm, w - wm_w))
    y_wm = max(0, min(y_wm, h - wm_h))

    if debug:
        # Draw final watermark position with more info
        cv2.rectangle(debug_img, (x_wm, y_wm), (x_wm + wm_w, y_wm + wm_h), (0, 0, 255), 2)
        cv2.putText(debug_img, f"Watermark: {wm_w}x{wm_h}", (x_wm, y_wm - 10), 
                   font, 0.5, (0, 0, 255), 1)
        cv2.putText(debug_img, f"Position: ({x_wm}, {y_wm})", (x_wm, y_wm - 30), 
                   font, 0.5, (0, 0, 255), 1)
        
        cv2.imshow("Debug View", debug_img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    # Step 5: Apply watermark with alpha blending (optimized version)
    overlay = img.copy()
    alpha = 0.4  # Default transparency
    
    # Extract alpha channel if exists
    if watermark.shape[2] == 4:
        alpha_channel = watermark[:,:,3] / 255.0 * 0.4
        watermark = watermark[:,:,:3]
    else:
        alpha_channel = np.ones((wm_h, wm_w)) * 0.4
    
    # ROI selection
    roi = overlay[y_wm:y_wm+wm_h, x_wm:x_wm+wm_w]
    
    # Blend using numpy for better performance
    for c in range(3):
        roi[:,:,c] = (watermark[:,:,c] * alpha_channel + 
                      roi[:,:,c] * (1 - alpha_channel))
    
    overlay[y_wm:y_wm+wm_h, x_wm:x_wm+wm_w] = roi
    img = overlay

    # Step 6: LSB Steganography
    binary_secret = ''.join(format(ord(c), '08b') for c in secret_text)
    binary_secret += '1111111111111110'  # delimiter
    index = 0

    for row in img:
        for pixel in row:
            for i in range(3):
                if index < len(binary_secret):
                    pixel[i] = int((int(pixel[i]) & ~1) | int(binary_secret[index]))
                    index += 1

    img = np.clip(img, 0, 255).astype(np.uint8)
    cv2.imwrite(output_path, img)
    return found_face

# encoded only
def encode_text_image(input_path: str, output_path: str, secret_text: str):
    """
    Encodes an image with:
    1. Date/time text watermark
    2. Secret message via LSB steganography
    (without logo/visual watermark)
    """
    # Read input image
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError("Invalid input image")

    h, w = img.shape[:2]

    # Step 1: Add datetime text watermark (bottom-right corner)
    watermark_text = datetime.now().strftime('%Y-%m-%d %H:%M')
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.5
    thickness = 1
    color = (255, 255, 255)  # White text
    text_size = cv2.getTextSize(watermark_text, font, scale, thickness)[0]
    x_text = w - text_size[0] - 10  # 10px margin from right
    y_text = h - 10  # 10px margin from bottom
    cv2.putText(img, watermark_text, (x_text, y_text), font, scale, color, thickness)

    # Step 2: LSB Steganography
    binary_secret = ''.join(format(ord(c), '08b') for c in secret_text)
    binary_secret += '1111111111111110'  # 16-bit delimiter
    index = 0

    for row in img:
        for pixel in row:
            for i in range(3):  # For each color channel (BGR)
                if index < len(binary_secret):
                    # Replace LSB with secret bit
                    pixel[i] = int((int(pixel[i]) & ~1) | int(binary_secret[index]))
                    index += 1
                else:
                    break  # Secret fully embedded

    # Save the result
    cv2.imwrite(output_path, img)

def decode_image(image_path: str) -> str:
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Invalid image")

    binary_data = ""
    for row in img:
        for pixel in row:
            for i in range(3):
                binary_data += str(pixel[i] & 1)

    delimiter = '1111111111111110'
    end_index = binary_data.find(delimiter)
    if end_index == -1:
        raise ValueError("No hidden message found.")

    message_bits = binary_data[:end_index]
    decoded_text = ""
    for i in range(0, len(message_bits), 8):
        byte = message_bits[i:i+8]
        decoded_text += chr(int(byte, 2))

    return decoded_text
