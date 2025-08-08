import json
from pathlib import Path
from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from backend.core.firebase import auth as firebase_auth, db
from starlette.responses import RedirectResponse

USERS = {
    "admin@example.com": {
        "password": "admin123",
        "role": "admin"
    }
}

NAV_LINKS = [
  {
    "name": "Dashboard",
    "icon": "layout-dashboard",
    "url": "#",
    "submenu": [
      {"name": "Deposit","tab":"deposit", "url": "/dashboard", "icon": "dollar-sign", "table": "deposit"},
    ]
  },
  {"name": "Profile", "url": "/profile", "icon": "user"},
  {"name": "CRM", "url": "/crm", "icon": "users"},
  {"name": "Camera", "url": "/camera", "icon": "camera"},
]

NAV_LINKS_CRM = [
  {
    "name": "Dashboard",
    "icon": "layout-dashboard",
    "url": "#",
    "submenu": [
    #   {"name": "Deposit","tab":"deposit", "url": "/dashboard", "icon": "dollar-sign", "table": "deposit"},
    ]
  },
#   {"name": "Profile", "url": "/profile", "icon": "user"},
  {"name": "CRM", "url": "/crm", "icon": "users"},
  # {"name": "Camera", "url": "/camera", "icon": "camera"},
]

NAV_LINKS_KYC = [
  {
    "name": "Dashboard",
    "icon": "layout-dashboard",
    "url": "#",
    "submenu": [
    #   {"name": "Deposit","tab":"deposit", "url": "/dashboard", "icon": "dollar-sign", "table": "deposit"},
    ]
  },
#   {"name": "Profile", "url": "/profile", "icon": "user"},
 {"name": "Identification", "url": "/kyc/identification", "icon": "id-card"}
  # {"name": "Camera", "url": "/camera", "icon": "camera"},
]


def check_auth(request: Request, bypass_paths: list[str] = ["/"]):
    if request.url.path in bypass_paths:
        return None  # Allow public access

    session_cookie = request.cookies.get("session")
    if not session_cookie:
        return RedirectResponse("/", status_code=302)

    try:
        # 🔐 Use session cookie instead of ID token
        decoded = firebase_auth.verify_session_cookie(session_cookie, check_revoked=True)
        uid = decoded.get("uid")

        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            return RedirectResponse("/", status_code=302)

        return user_doc.to_dict()

    except Exception as e:
        print(f"Auth error: {e}")
        return RedirectResponse("/", status_code=302)


def check_auth_kyc(request: Request, bypass_paths: list[str] = ["/"]):
    if request.url.path in bypass_paths:
        return None  # Allow public access

    session_cookie = request.cookies.get("session")
    user_roles_cookie = request.cookies.get("user_roles")
    if not session_cookie:
        return None  # Not logged in

    try:
        # ✅ Load user database
        json_path = Path(__file__).resolve().parent.parent / "data" / "players.json"
        with open(json_path, "r", encoding="utf-8") as f:
            users = json.load(f)

        # ✅ Handle single user (dict) or multiple users (list)
        if isinstance(users, dict):
            user = users if users.get("user_id") == session_cookie else None
        else:
            user = next((u for u in users if u.get("user_id") == session_cookie), None)

        if not user:
            return None

        # ✅ Parse user_roles from cookie
        user_roles = {}
        if user_roles_cookie:
            try:
                user_roles = json.loads(user_roles_cookie)
            except json.JSONDecodeError:
                pass

        # ✅ Merge and return
        return {
            "user": user,
            "roles": user_roles
        }

    except Exception as e:
        print(f"Auth error: {e}")
        return None
