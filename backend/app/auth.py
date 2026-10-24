"""
Authentication & Authorization Module for NoteLoom V2.
Verifies Supabase JWT tokens for multi-tenant data isolation and guest support.
"""

from typing import Optional
from fastapi import Header, HTTPException, Depends
from pydantic import BaseModel
import jwt
from backend.app.config import config


class CurrentUser(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: Optional[str] = None
    is_authenticated: bool = True


def get_current_user_optional(
    authorization: Optional[str] = Header(None)
) -> Optional[CurrentUser]:
    """
    Extracts and verifies Supabase JWT token from Authorization header if present.
    Returns None for guest users (enables seamless guest mode).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        return None

    try:
        if config.supabase_jwt_secret:
            # Full cryptographically verified token decoding
            payload = jwt.decode(
                token,
                config.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True},
            )
        else:
            # Fallback for dev / testing when secret is not configured yet
            payload = jwt.decode(token, options={"verify_signature": False})

        user_id = payload.get("sub")
        if not user_id:
            return None

        return CurrentUser(
            user_id=user_id,
            email=payload.get("email"),
            role=payload.get("role"),
            is_authenticated=True,
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
    except Exception:
        return None


def get_current_user_required(
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional)
) -> CurrentUser:
    """
    Strict dependency requiring authentication. Raises 401 if user is a guest.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required. Please sign in.")
    return current_user

