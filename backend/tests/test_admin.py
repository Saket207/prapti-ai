"""
Test suite for Prapti-AI Admin endpoints (/admin/*) and role authorization guards.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app

client = TestClient(app)


def test_admin_items_unauthenticated():
    res = client.get("/admin/items")
    assert res.status_code == 401
    assert "detail" in res.json()


def test_admin_items_student_forbidden():
    res = client.get("/admin/items", headers={"Authorization": "Bearer dev-test-student-token"})
    assert res.status_code == 403
    assert res.json()["detail"] == "Admin privileges required."


def test_admin_stats_student_forbidden():
    res = client.get("/admin/stats", headers={"Authorization": "Bearer dev-test-student-token"})
    assert res.status_code == 403
    assert res.json()["detail"] == "Admin privileges required."


def test_admin_openapi_registration():
    res = client.get("/openapi.json")
    assert res.status_code == 200
    paths = res.json()["paths"]
    assert "/admin/items" in paths
    assert "/admin/items/{id}/status" in paths
    assert "/admin/original/{id}" in paths
    assert "/admin/stats" in paths


if __name__ == "__main__":
    test_admin_items_unauthenticated()
    test_admin_items_student_forbidden()
    test_admin_stats_student_forbidden()
    test_admin_openapi_registration()
    print("All backend admin tests passed!")
