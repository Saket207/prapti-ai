import logging
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.db import get_supabase_admin

logger = logging.getLogger("prapti-auth")
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """
    FastAPI dependency to extract and verify the Supabase access token (JWT)
    from the HTTP Authorization header (format: `Bearer <token>`).
    
    Returns a dict containing the student's `id`, `email`, and `role`.
    Raises HTTP 401 if token is missing, invalid, or expired.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header with Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Development-only bypass token for local testing without active browser login
    if settings.DEBUG:
        if token == "dev-test-student-token":
            return {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "student.test@dsce.edu.in",
                "role": "student",
            }
        elif token == "dev-test-admin-token":
            return {
                "id": "00000000-0000-0000-0000-000000000002",
                "email": "admin.security@dsce.edu.in",
                "role": "admin",
            }

    # Verify real JWT token with Supabase Auth
    try:
        admin_client = get_supabase_admin()
        user_response = admin_client.auth.get_user(jwt=token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user = user_response.user
        role = getattr(user, "user_metadata", {}).get("role", "student")
        return {
            "id": str(user.id),
            "email": user.email,
            "role": role,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"Token validation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Invalid token provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_admin(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    FastAPI dependency that enforces administrative privileges.
    Raises HTTP 403 Forbidden if the user's role is not 'admin'.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    return current_user

