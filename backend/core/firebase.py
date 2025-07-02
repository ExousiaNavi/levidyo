from firebase_admin import credentials, initialize_app, auth
from google.cloud import firestore
from google.oauth2 import service_account
from dotenv import dotenv_values
from pathlib import Path
import firebase_admin

# Load .env
env = dotenv_values(Path(__file__).resolve().parent.parent / ".env")

# Validate
private_key = env.get("FIREBASE_PRIVATE_KEY")
if not private_key:
    raise RuntimeError("FIREBASE_PRIVATE_KEY missing or not loaded")

# Format private key correctly
private_key = private_key.replace("\\n", "\n")

# Shared service account dict
service_account_info = {
    "type": "service_account",
    "project_id": env["FIREBASE_PROJECT_ID"],
    "private_key_id": env["FIREBASE_PRIVATE_KEY_ID"],
    "private_key": private_key,
    "client_email": env["FIREBASE_CLIENT_EMAIL"],
    "client_id": env["FIREBASE_CLIENT_ID"],
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": env["FIREBASE_CLIENT_X509_CERT_URL"]
}

# ✅ 1. Firebase Admin SDK (for Auth)
firebase_cred = credentials.Certificate(service_account_info)
if not firebase_admin._apps:
    initialize_app(firebase_cred)

# ✅ 2. Google Auth Credentials (for Firestore)
firestore_cred = service_account.Credentials.from_service_account_info(service_account_info)

# ✅ 3. Initialize Firestore with proper credentials
db = firestore.Client(project=env["FIREBASE_PROJECT_ID"], credentials=firestore_cred)
