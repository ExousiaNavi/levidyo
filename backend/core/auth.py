from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from backend.core.firebase import auth as firebase_auth, db

USERS = {
    "admin@example.com": {
        "password": "admin123",
        "role": "admin"
    }
}

# NAV_LINKS = [
#     {"name": "Dashboard", "url": "/dashboard", "icon": "layout-dashboard"},
#     {"name": "Deposits", "url": "/deposits", "icon": "dollar-sign"},
#     {"name": "Profile", "url": "/profile", "icon": "user"},
# ]

NAV_LINKS = [
  {
    "name": "Dashboard",
    "icon": "layout-dashboard",
    "url": "#",
    "submenu": [
      {"name": "Deposit","tab":"deposit", "url": "/dashboard", "icon": "dollar-sign", "table": "deposit"},
      {"name": "Withdraw","tab":"withdraw", "url": "/dashboard", "icon": "dollar-sign", "table": "withdraw"},
      {"name": "Pending Deposit","tab":"pendingdeposit", "url": "/dashboard", "icon": "dollar-sign", "table": "pendingdeposit"},
      {"name": "Pending Withdraw","tab":"pendingwithdraw", "url": "/dashboard","icon": "dollar-sign", "table": "pendingwithdraw"},
      
    ]
  },
  {"name": "Profile", "url": "/profile", "icon": "user"},
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
