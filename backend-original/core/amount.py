from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from backend.core.firebase import db

def get_target_amount():
    doc_ref = db.collection("deposit").document("target_dp")
    doc = doc_ref.get()
    if doc.exists:
        return doc.to_dict().get("dp_amount", 0)
    return 0
