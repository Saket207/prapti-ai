from typing import Optional, Any
from app.config import settings

try:
    from supabase import create_client, Client
except (ImportError, AttributeError):
    create_client = None  # type: ignore
    Client = Any  # type: ignore


_admin_client: Optional[Client] = None


def get_supabase_admin() -> Client:
    """
    Returns a singleton Supabase client using the SERVICE_ROLE key.
    This client bypasses Row Level Security (RLS) and is used exclusively
    by the backend for database mutations, secrets verification, and storage operations.
    """
    global _admin_client
    if _admin_client is None:
        if create_client is None:
            raise RuntimeError(
                "The 'supabase' Python package is not installed. Please run: pip install -r backend/requirements.txt"
            )
        _admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _admin_client


def get_supabase_user_client(access_token: str) -> Client:
    """
    Returns a Supabase client configured with a specific user's JWT access token.
    Useful for verifying caller identity or performing actions within the caller's RLS scope.
    """
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.postgrest.auth(access_token)
    return client
