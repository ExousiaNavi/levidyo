# 📦 Backend

Backend service for Levidyo — handles authentication, deposits, KYC processing, CRM dashboard, and utility functions.

---

## 📂 Project Structure

```plaintext
📦 backend
 ┣ 📂core               # Core application logic (auth, deposit, user management, etc.)
 ┃ ┣ 📜amount.py
 ┃ ┣ 📜auth.py
 ┃ ┣ 📜deposit.py
 ┃ ┣ 📜firebase.py
 ┃ ┣ 📜role.py
 ┃ ┣ 📜templates.py
 ┃ ┣ 📜users.py
 ┃ ┗ 📜whitelist.py
 ┣ 📂data               # Static data and JSON files
 ┃ ┣ 📜players.json
 ┃ ┗ 📜submit_kyc.json
 ┣ 📂filters            # Data filtering and brand-specific logic
 ┃ ┗ 📜brand.py
 ┣ 📂routes             # API route definitions
 ┃ ┣ 📂crm              # CRM dashboard routes
 ┃ ┃ ┗ 📜crm_dashboard.py
 ┃ ┣ 📂kyc              # KYC-related routes
 ┃ ┃ ┣ 📜auth_kyc.py
 ┃ ┃ ┣ 📜kyc.py
 ┃ ┃ ┣ 📜kyc_dashboard.py
 ┃ ┃ ┣ 📜kyc_data.py
 ┃ ┃ ┣ 📜kyc_verification.py
 ┃ ┃ ┗ 📜kyc_verified.py
 ┃ ┣ 📜amount.py
 ┃ ┣ 📜auth.py
 ┃ ┣ 📜context.py
 ┃ ┣ 📜dashboard.py
 ┃ ┣ 📜deposit.py
 ┃ ┣ 📜empty.py
 ┃ ┣ 📜profile.py
 ┃ ┣ 📜username.py
 ┃ ┣ 📜users.py
 ┃ ┗ 📜verification.py
 ┣ 📂sessions           # Session management logic
 ┃ ┗ 📜session_manager.py
 ┣ 📂utils              # Utility functions
 ┃ ┗ 📜stego_utils.py
 ┣ 📜.env               # Environment variables
 ┣ 📜config.py          # Configuration settings
 ┣ 📜main.py            # Application entry point
 ┗ 📜requirements.txt   # Python dependencies



 # 🎨 Frontend

Frontend interface for [Your Project Name] — includes static assets, templates, JavaScript modules for KYC and camera handling, and upload handling.

---

## 📂 Project Structure

```plaintext
📦 frontend
 ┣ 📂static             # Static assets (CSS, JS, images, models, uploads)
 ┃ ┣ 📂css
 ┃ ┃ ┣ 📜login.css
 ┃ ┃ ┗ 📜styles.css
 ┃ ┣ 📂haarcascades     # Haarcascade XML files for face detection
 ┃ ┃ ┗ 📜haarcascade_frontalface_default.xml
 ┃ ┣ 📂js
 ┃ ┃ ┣ 📂module         # Modular JavaScript files for KYC, camera, uploads
 ┃ ┃ ┃ ┣ 📜camera.js
 ┃ ┃ ┃ ┣ 📜capture.js
 ┃ ┃ ┃ ┣ 📜delete.js
 ┃ ┃ ┃ ┣ 📜detection.js
 ┃ ┃ ┃ ┣ 📜error.js
 ┃ ┃ ┃ ┣ 📜loader.js
 ┃ ┃ ┃ ┣ 📜models.js
 ┃ ┃ ┃ ┣ 📜review.js
 ┃ ┃ ┃ ┣ 📜state.js
 ┃ ┃ ┃ ┣ 📜submitVerification.js
 ┃ ┃ ┃ ┣ 📜upload.js
 ┃ ┃ ┃ ┗ 📜username.js
 ┃ ┃ ┣ 📜camera copy.js
 ┃ ┃ ┣ 📜camera.js
 ┃ ┃ ┣ 📜camerav2.js
 ┃ ┃ ┣ 📜face-api.js
 ┃ ┃ ┣ 📜face-api.js.map
 ┃ ┃ ┣ 📜face-api.min.js
 ┃ ┃ ┣ 📜kyc.js
 ┃ ┃ ┗ 📜steganography.js
 ┃ ┣ 📂logo
 ┃ ┃ ┣ 📜b.png
 ┃ ┃ ┗ 📜lg.png
 ┃ ┣ 📂models           # Face recognition model files
 ┃ ┃ ┣ 📜face_landmark_68_model-shard1
 ┃ ┃ ┣ 📜face_landmark_68_model-weights_manifest.json
 ┃ ┃ ┣ 📜tiny_face_detector_model-shard1
 ┃ ┃ ┗ 📜tiny_face_detector_model-weights_manifest.json
 ┃ ┣ 📂templates
 ┃ ┃ ┣ 📜card.png
 ┃ ┃ ┗ 📜card1.png
 ┃ ┣ 📂uploads
 ┃ ┃ ┣ 📂bin
 ┃ ┃ ┃ ┗ 📜20250811162725_b0d5d80d056446f294b27d388109e36b.png
 ┃ ┃ ┗ 📂kyc
 ┃ ┃ ┃ ┗ 📂guest_1
 ┃ ┃ ┃ ┃ ┣ 📜back_2025081116.png
 ┃ ┃ ┃ ┃ ┣ 📜front_2025081116.png
 ┃ ┃ ┃ ┃ ┗ 📜selfie_2025081116.png
 ┃ ┗ 📂upload_ids
 ┃ ┃ ┗ 📜id_idBack_20250804150831_c24e2ccbd1be4091aae17abf15ae14c2.png
 ┗ 📂templates          # HTML templates
 ┃ ┣ 📂components
 ┃ ┃ ┣ 📂kyc
 ┃ ┃ ┃ ┣ 📜kyc_not_verified.html
 ┃ ┃ ┃ ┗ 📜kyc_verified.html
 ┃ ┃ ┗ 📜sidebar.html
 ┃ ┣ 📂pages
 ┃ ┃ ┣ 📂admin
 ┃ ┃ ┃ ┣ 📂components
 ┃ ┃ ┃ ┃ ┣ 📜card.html
 ┃ ┃ ┃ ┃ ┣ 📜deposit-card.html
 ┃ ┃ ┃ ┃ ┣ 📜deposit-chart.html
 ┃ ┃ ┃ ┃ ┣ 📜pending-deposit-card.html
 ┃ ┃ ┃ ┃ ┣ 📜pending-withdraw-card.html
 ┃ ┃ ┃ ┃ ┗ 📜withdraw-card.html
 ┃ ┃ ┃ ┣ 📜dashboard.html
 ┃ ┃ ┃ ┣ 📜deposits.html
 ┃ ┃ ┃ ┗ 📜profile.html
 ┃ ┃ ┣ 📂auth
 ┃ ┃ ┃ ┗ 📜login.html
 ┃ ┃ ┣ 📂crm
 ┃ ┃ ┃ ┗ 📜dashboard.html
 ┃ ┃ ┣ 📂kyc
 ┃ ┃ ┃ ┣ 📜auth.html
 ┃ ┃ ┃ ┣ 📜dashboard.html
 ┃ ┃ ┃ ┣ 📜index.html
 ┃ ┃ ┃ ┣ 📜verification.html
 ┃ ┃ ┃ ┗ 📜verified.html
 ┃ ┃ ┣ 📜blank.html
 ┃ ┃ ┣ 📜camera.html
 ┃ ┃ ┣ 📜camera1.html
 ┃ ┃ ┗ 📜unauthorized.html
 ┃ ┗ 📜base.html

