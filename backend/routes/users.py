from fastapi import APIRouter, Request, Form, HTTPException
from fastapi.responses import JSONResponse
from backend.core.firebase import db
from backend.core.users import get_non_super_users, update_user_role
from backend.core.role import get_roles_from_app_roles 

router = APIRouter()

@router.get("/users/list")
async def users_list():
    users = get_non_super_users()
    return JSONResponse(content=users)


@router.post("/users/create")
async def create_user(email: str = Form(...), role: str = Form(...)):
    # Check if user already exists
    existing_users = list(db.collection("users").where("email", "==", email).stream())
    if existing_users:
        return JSONResponse(status_code=200, content={
            "success": False,
            "message": f"A user with the email '{email}' already exists."
        })

    # Check if role is valid
    valid_roles = [r["label"] for r in get_roles_from_app_roles()]
    if role not in valid_roles:
        return JSONResponse(status_code=200, content={
            "success": False,
            "message": f"The role '{role}' is invalid."
        })

    # Create user
    db.collection("users").add({
        "email": email,
        "role": role,
        "active": True
    })

    return JSONResponse(status_code=200, content={
        "success": True,
        "message": f"User '{email}' created successfully."
    })

@router.post("/users/{user_id}/change-role")
async def change_user_role(user_id: str, role: str = Form(...)):
    try:
        # your logic to update the role in database
        update_user_role(user_id, role)
        return JSONResponse({"success": True, "message": "Role updated successfully."})
    except Exception as e:
        return JSONResponse({"success": False, "message": str(e)})