from backend.core.firebase import db

def get_roles_from_app_roles():
    doc = db.collection("roles").document("appRoles").get()

    if not doc.exists:
        return []

    data = doc.to_dict()
    role_list = data.get("roles", [])  # roles is a list now

    roles = set()
    for role in role_list:
        role = str(role).strip()
        if role.lower() != "super":
            roles.add(role)

    return sorted([
        {"label": role.capitalize(), "value": role.lower()}
        for role in roles
    ], key=lambda x: x["label"])

