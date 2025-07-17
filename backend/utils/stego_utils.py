from datetime import datetime
import cv2
import numpy as np

def encode_image(input_path: str, output_path: str, secret_text: str):
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError("Invalid image")

    # Add small watermark (bottom-right)
    h, w = img.shape[:2]
    watermark = f"{datetime.now().strftime('%Y-%m-%d %H:%M')}"
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.5
    thickness = 1
    color = (255, 255, 255)
    text_size = cv2.getTextSize(watermark, font, scale, thickness)[0]
    x = w - text_size[0] - 10
    y = h - 10
    cv2.putText(img, watermark, (x, y), font, scale, color, thickness)

    # Encode secret message using LSB
    binary_secret = ''.join(format(ord(c), '08b') for c in secret_text)
    binary_secret += '1111111111111110'  # End-of-message delimiter
    index = 0

    for row in img:
        for pixel in row:
            for i in range(3):  # For R, G, B channels
                if index < len(binary_secret):
                    pixel[i] = (int(pixel[i]) & ~1) | int(binary_secret[index])
                    index += 1

    # Optional: Clip to ensure values are within 0–255
    img = np.clip(img, 0, 255).astype(np.uint8)

    # Save final image
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


