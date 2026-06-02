from backend.core.firebase import db

def get_non_super_users():
    users_ref = db.collection("users")
    docs = users_ref.stream()

    return [
        doc.to_dict() | {"id": doc.id}
        for doc in docs
        if doc.to_dict().get("role") != "super"
    ]

def update_user_role(user_id: str, new_role: str):
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()

    if not user_doc.exists:
        raise Exception("User not found.")

    user_ref.update({"role": new_role.lower()})