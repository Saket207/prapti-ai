"""
Unit and integration tests for Prapti-AI notification engine.
Verifies all 4 contract events: match_found, claim_received, handover_ready, returned.
"""

import sys
import unittest
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from notifications.notify import notify, notify_user_by_id
from notifications.email_sender import send_email


class TestNotificationEngine(unittest.TestCase):

    def setUp(self):
        self.recipient = {
            "email": "test.student@dsce.edu.in",
            "full_name": "Test Student",
            "id": "00000000-0000-0000-0000-000000000001",
        }

    def test_send_email_base(self):
        """Verify direct send_email call dispatches cleanly."""
        res = send_email(
            to_email="test.student@dsce.edu.in",
            subject="Test Notification",
            html_content="<p>Test Content</p>",
            text_content="Test Content",
            recipient_name="Test Student",
        )
        self.assertTrue(res)

    def test_event_match_found(self):
        """Verify match_found event formats properly and returns True."""
        data = {
            "category": "wallet",
            "score": 0.88,
            "location_name": "Central Library, Ground Floor",
            "location_id": "central_library",
            "description": "Black leather Tommy Hilfiger wallet found on desk 14",
        }
        res = notify("match_found", self.recipient, data)
        self.assertTrue(res)

    def test_event_claim_received(self):
        """Verify claim_received event formats properly and returns True."""
        data = {
            "category": "keys",
            "found_item_id": "11111111-1111-1111-1111-111111111111",
        }
        res = notify("claim_received", self.recipient, data)
        self.assertTrue(res)

    def test_event_handover_ready(self):
        """Verify handover_ready event formats properly with QR token."""
        data = {
            "category": "headphones",
            "qr_token": "prapti_xK9mZ8Lq2NvP4RtW0Y1U3sA7",
            "location_id": "canteen",
        }
        res = notify("handover_ready", self.recipient, data)
        self.assertTrue(res)

    def test_event_returned(self):
        """Verify returned event formats properly and returns True."""
        data = {
            "category": "water bottle",
            "returned_at": "2026-10-21T02:00:00Z",
        }
        res = notify("returned", self.recipient, data)
        self.assertTrue(res)

    def test_missing_recipient_email_graceful_handling(self):
        """Verify that calling notify with missing email returns False without crashing."""
        res = notify("match_found", {"email": None}, {"category": "phone"})
        self.assertFalse(res)

    def test_unknown_event_graceful_handling(self):
        """Verify that calling notify with an unknown event returns False without crashing."""
        res = notify("unknown_event_xyz", self.recipient, {})
        self.assertFalse(res)


if __name__ == "__main__":
    unittest.main()
