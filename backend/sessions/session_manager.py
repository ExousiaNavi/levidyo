import json
from datetime import timedelta
from starlette.responses import RedirectResponse

async def create_user_session(
    request,
    user_id: str,
    roles: list[str],
    is_admin: bool,
    is_crm: bool,
    is_player: bool,
    redirect_path: str = "/dashboard"
):
    """Reusable function to create session cookies."""
    expires_in = timedelta(days=7)

    response = RedirectResponse(redirect_path, status_code=303)

    is_production = not request.url.hostname in ['localhost', '127.0.0.1']

    # ✅ Store session and roles in cookies
    response.set_cookie(
        key="session",
        value=user_id,  # You can later hash or encrypt this
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=int(expires_in.total_seconds()),
        path="/",
    )

    response.set_cookie(
        key="user_roles",
        value=json.dumps({
            "roles": roles,
            "is_player": is_player,
            "is_admin": is_admin,
            "is_crm": is_crm
        }),
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=int(expires_in.total_seconds()),
        path="/",
    )

    return response
