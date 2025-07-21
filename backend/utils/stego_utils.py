from datetime import datetime
import cv2
import numpy as np


def encode_image(input_path: str, output_path: str, secret_text: str,
                 watermark_path="watermark.png", face_box=None):
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError("Invalid input image")

    h, w = img.shape[:2]

    # Step 1: Add datetime text watermark (bottom-right corner)
    watermark_text = datetime.now().strftime('%Y-%m-%d %H:%M')
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

    # Step 3: Resize watermark to be bigger (e.g., 20% of image height)
    target_height = h * 0.3
    scale_factor = target_height / wm_h
    watermark = cv2.resize(watermark, (int(wm_w * scale_factor), int(wm_h * scale_factor)))
    wm_h, wm_w = watermark.shape[:2]

    # Step 4: Position at bottom-center
    x_wm = (w - wm_w) // 2
    y_wm = h - wm_h - 10  # 10px margin from bottom

    # Step 5: Ensure watermark stays within image bounds
    x_wm = max(0, min(x_wm, w - wm_w))
    y_wm = max(0, min(y_wm, h - wm_h))

    # Step 6: Apply watermark with alpha blending
    overlay = img.copy()
    for i in range(wm_h):
        for j in range(wm_w):
            y = y_wm + i
            x = x_wm + j
            if y >= h or x >= w:
                continue
            if watermark.shape[2] == 4:
                alpha = watermark[i, j, 3] / 255.0 * 0.4  # transparency
            else:
                alpha = 0.3
            for c in range(3):
                overlay[y, x, c] = alpha * watermark[i, j, c] + (1 - alpha) * overlay[y, x, c]

    img = overlay

    # Step 7: LSB Steganography
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
