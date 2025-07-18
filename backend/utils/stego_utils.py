from datetime import datetime
import cv2
import numpy as np

def encode_image(input_path: str, output_path: str, secret_text: str, watermark_path="watermark.png"):
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

    # Resize watermark
    scale_factor = 0.55  # Adjust size here
    wm_h, wm_w = watermark.shape[:2]
    watermark = cv2.resize(watermark, (int(wm_w * scale_factor), int(wm_h * scale_factor)))
    wm_h, wm_w = watermark.shape[:2]

    # Resize watermark if it's bigger than image
    if wm_h > h or wm_w > w:
        scale_h = h / wm_h
        scale_w = w / wm_w
        scale_factor = min(scale_h, scale_w) * 0.9  # leave margin
        watermark = cv2.resize(watermark, (int(wm_w * scale_factor), int(wm_h * scale_factor)))
        wm_h, wm_w = watermark.shape[:2]

    # Step 3: Always center watermark (ignore face detection)
    x_wm = (w - wm_w) // 2
    y_wm = (h - wm_h) // 2

    # Ensure watermark stays within image bounds
    x_wm = max(0, min(x_wm, w - wm_w))
    y_wm = max(0, min(y_wm, h - wm_h))

    # Step 4: Apply watermark with transparency
    overlay = img.copy()
    for i in range(wm_h):
        for j in range(wm_w):
            y = y_wm + i
            x = x_wm + j
            if y >= h or x >= w:
                continue
            if watermark.shape[2] == 4:
                alpha = watermark[i, j, 3] / 255.0 * 0.3  # Adjust opacity
            else:
                alpha = 0.3
            for c in range(3):
                overlay[y, x, c] = (
                    alpha * watermark[i, j, c] + (1 - alpha) * overlay[y, x, c]
                )

    img = overlay

    # Step 5: Encode secret message using LSB
    binary_secret = ''.join(format(ord(c), '08b') for c in secret_text)
    binary_secret += '1111111111111110'  # End delimiter
    index = 0

    for row in img:
        for pixel in row:
            for i in range(3):  # BGR
                if index < len(binary_secret):
                    pixel[i] = int((int(pixel[i]) & ~1) | int(binary_secret[index]))
                    index += 1

    # Step 6: Save the final image
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


