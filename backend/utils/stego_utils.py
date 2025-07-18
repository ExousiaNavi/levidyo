from datetime import datetime
import cv2
import numpy as np

def encode_image(input_path: str, output_path: str, secret_text: str, watermark_path="watermark.png"):
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError("Invalid image")

    # Step 1: Add datetime text watermark (bottom-right corner)
    h, w = img.shape[:2]
    watermark_text = f"{datetime.now().strftime('%Y-%m-%d %H:%M')}"
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

    # Resize watermark if too big
    scale_factor = 0.25
    wm_h, wm_w = watermark.shape[:2]
    watermark = cv2.resize(watermark, (int(wm_w * scale_factor), int(wm_h * scale_factor)))
    wm_h, wm_w = watermark.shape[:2]

    # Step 3: Face detection
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

    # Determine watermark position
    if len(faces) > 0:
        x_face, y_face, w_face, h_face = faces[0]
        x_wm = x_face + (w_face - wm_w) // 2
        y_wm = y_face + (h_face - wm_h) // 2
    else:
        x_wm = (w - wm_w) // 2
        y_wm = (h - wm_h) // 2

    # Step 4: Apply watermark with opacity
    overlay = img.copy()
    for i in range(wm_h):
        for j in range(wm_w):
            if y_wm + i >= h or x_wm + j >= w:
                continue
            alpha = 0.50  # watermark opacity
            if watermark.shape[2] == 4:  # If watermark has alpha channel
                alpha *= watermark[i, j, 3] / 255.0
            for c in range(3):
                overlay[y_wm + i, x_wm + j, c] = (
                    alpha * watermark[i, j, c] + (1 - alpha) * overlay[y_wm + i, x_wm + j, c]
                )

    img = overlay

    # Step 5: Hide secret message using LSB
    binary_secret = ''.join(format(ord(c), '08b') for c in secret_text)
    binary_secret += '1111111111111110'  # End-of-message delimiter
    index = 0

    for row in img:
        for pixel in row:
            for i in range(3):  # R, G, B
                if index < len(binary_secret):
                    pixel[i] = (int(pixel[i]) & ~1) | int(binary_secret[index])
                    index += 1

    # Save encoded image
    img = np.clip(img, 0, 255).astype(np.uint8)
    cv2.imwrite(output_path, img)

def decode_image(image_path: str) -> str:
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Invalid image")

    binary_data = ""
    for row in img:
        for pixel in row:
            for i in range(3):  # R, G, B
                binary_data += str(pixel[i] & 1)

    # Find the delimiter
    delimiter = '1111111111111110'
    end_index = binary_data.find(delimiter)
    if end_index == -1:
        raise ValueError("No hidden message found.")

    # Slice the binary message
    message_bits = binary_data[:end_index]
    decoded_text = ""
    for i in range(0, len(message_bits), 8):
        byte = message_bits[i:i+8]
        decoded_text += chr(int(byte, 2))

    return decoded_text


