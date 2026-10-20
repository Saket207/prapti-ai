"""
Prapti-AI Notifications Module
"""

from notifications.notify import notify, notify_user_by_id
from notifications.email_sender import send_email

__all__ = ["notify", "notify_user_by_id", "send_email"]
