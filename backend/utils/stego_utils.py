from datetime import datetime, timedelta, timezone
import cv2
import numpy as np

def encode_image(input_path: str, output_path: str, secret_text: str,
                 watermark_path="watermark.png", face_box=None):
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError("Invalid input image")

    h, w = img.shape[:2]

    # Step 1: Add datetime text watermark
    # Start from UTC (timezone-aware)
    utc_time = datetime.now(timezone.utc)
    # Add 8 hours for GMT+8
    local_time = utc_time + timedelta(hours=8)
    watermark_text = local_time.strftime('%Y-%m-%d %H:%M')
    # watermark_text = datetime.now().strftime('%Y-%m-%d %H:%M')
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.5
    thickness = 1
    color = (255, 255, 255)
    text_size = cv2.getTextSize(watermark_text, font, scale, thickness)[0]
    x_text = w - text_size[0] - 10
    y_text = h - 10
    cv2.putText(img, watermark_text, (x_text, y_text), font, scale, color, thickness)

    # Step 2: Load watermark image
    watermark = cv2.imread(watermark_path, cv2.IMREAD_UNCHANGED)
    if watermark is None:
        raise ValueError("Invalid watermark image")

    wm_h, wm_w = watermark.shape[:2]

    # Step 3: Resize watermark proportionally (max 25% of image height or 40% of width)
    target_height = min(h * 0.25, w * 0.4)
    scale_factor = target_height / wm_h
    watermark = cv2.resize(watermark, (int(wm_w * scale_factor), int(wm_h * scale_factor)))
    wm_h, wm_w = watermark.shape[:2]

    # Step 4: Detect face and position watermark dynamically
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.05,
        minNeighbors=6,
        minSize=(int(w/8), int(h/8))
    )

    min_face_area = (w * h) * 0.02
    valid_faces = [(x, y, fw, fh) for (x, y, fw, fh) in faces if fw * fh >= min_face_area]

    found_face = False
    if len(valid_faces) > 0:
        found_face = True
        image_center = (w // 2, h // 2)

        def distance_to_center(face):
            x, y, fw, fh = face
            face_center = (x + fw // 2, y + fh // 2)
            return (face_center[0] - image_center[0])**2 + (face_center[1] - image_center[1])**2

        main_face = min(valid_faces, key=distance_to_center)
        x, y, fw, fh = main_face
        margin = int(fh * 0.70)
        y_wm = y + fh + margin
        x_wm = x + (fw - wm_w) // 2
        x_wm = max(0, min(x_wm, w - wm_w))

        # Prevent overlap with timestamp
        if x_wm + wm_w > x_text - 10:
            x_wm = x_text - wm_w - 10

        if y_wm + wm_h > h:
            y_wm = h - wm_h - 20
    else:
        # Default bottom placement
        x_wm = (w - wm_w) // 2
        y_wm = h - wm_h - int(h * 0.05)

    x_wm = max(0, min(x_wm, w - wm_w))
    y_wm = max(0, min(y_wm, h - wm_h))

    # Step 5: Apply watermark with alpha blending
    overlay = img.copy()

    if watermark.shape[2] == 4:
        alpha_channel = watermark[:, :, 3] / 255.0 * 0.4
        watermark = watermark[:, :, :3]
    else:
        alpha_channel = np.ones((wm_h, wm_w)) * 0.4

    roi = overlay[y_wm:y_wm + wm_h, x_wm:x_wm + wm_w]
    for c in range(3):
        roi[:, :, c] = (watermark[:, :, c] * alpha_channel +
                        roi[:, :, c] * (1 - alpha_channel))

    overlay[y_wm:y_wm + wm_h, x_wm:x_wm + wm_w] = roi
    img = overlay

    # Step 6: Embed secret text (LSB steganography)
    binary_secret = ''.join(format(ord(c), '08b') for c in secret_text)
    binary_secret += '1111111111111110'
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


def encode_text_image(input_path: str, output_path: str, secret_text: str):
    """Encodes image with date/time watermark and LSB message (no logo)."""
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError("Invalid input image")

    h, w = img.shape[:2]
    # watermark_text = datetime.now().strftime('%Y-%m-%d %H:%M')
    # Start from UTC (timezone-aware)
    utc_time = datetime.now(timezone.utc)
    # Add 8 hours for GMT+8
    local_time = utc_time + timedelta(hours=8)
    watermark_text = local_time.strftime('%Y-%m-%d %H:%M')
    
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.5
    thickness = 1
    color = (255, 255, 255)
    text_size = cv2.getTextSize(watermark_text, font, scale, thickness)[0]
    x_text = w - text_size[0] - 10
    y_text = h - 10
    cv2.putText(img, watermark_text, (x_text, y_text), font, scale, color, thickness)

    binary_secret = ''.join(format(ord(c), '08b') for c in secret_text)
    binary_secret += '1111111111111110'
    index = 0

    for row in img:
        for pixel in row:
            for i in range(3):
                if index < len(binary_secret):
                    pixel[i] = int((int(pixel[i]) & ~1) | int(binary_secret[index]))
                    index += 1
                else:
                    break

    cv2.imwrite(output_path, img)


def decode_image(image_path: str) -> str:
    """Decodes hidden LSB message from image."""
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
        byte = message_bits[i:i + 8]
        decoded_text += chr(int(byte, 2))

    return decoded_text
