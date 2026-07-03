"""
Backend tests for Nofilter Lab — Waitlist + Stripe checkout + Product.

Covers iteration_2 review request:
- Product catalog: GET /api/products/the-clear-120
- Waitlist: POST /api/waitlist (fresh, duplicate, invalid), GET /api/waitlist/count
- Stripe checkout: POST /api/checkout/session (valid + invalid), GET /api/checkout/status/{id}
- payment_transactions collection is persisted with payment_status='initiated'
"""

import os
import time
import uuid

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def db():
    # For direct persistence assertions on payment_transactions
    c = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
    return c[DB_NAME]


# ---------------------------------------------------------------------------
# Product catalog
# ---------------------------------------------------------------------------
class TestProduct:
    def test_get_product_the_clear_120(self, api):
        r = api.get(f"{BASE_URL}/api/products/the-clear-120", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == "the-clear-120"
        assert data["name"] == "THE CLEAR — 120 ml"
        assert data["amount"] == 349.0
        assert data["currency"] == "dkk"
        assert isinstance(data["description"], str) and len(data["description"]) > 0

    def test_get_product_not_found(self, api):
        r = api.get(f"{BASE_URL}/api/products/does-not-exist", timeout=20)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Waitlist
# ---------------------------------------------------------------------------
class TestWaitlist:
    def test_fresh_email_subscribes_and_sends_email(self, api):
        email = f"TEST_waitlist_{uuid.uuid4().hex[:10]}@nofilterlab.com"
        r = api.post(
            f"{BASE_URL}/api/waitlist",
            json={"email": email, "source": "pytest"},
            timeout=45,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "subscribed"
        assert "message" in data and isinstance(data["message"], str)
        # Real welcome email should be triggered via Emergent email proxy
        assert data.get("email_sent") is True, f"email_sent flag was not True: {data}"

    def test_duplicate_email_returns_already_subscribed(self, api):
        email = f"TEST_waitlist_dup_{uuid.uuid4().hex[:10]}@nofilterlab.com"
        r1 = api.post(f"{BASE_URL}/api/waitlist", json={"email": email}, timeout=45)
        assert r1.status_code == 200, r1.text
        assert r1.json()["status"] == "subscribed"

        r2 = api.post(f"{BASE_URL}/api/waitlist", json={"email": email}, timeout=20)
        assert r2.status_code == 200, r2.text
        assert r2.json()["status"] == "already_subscribed"

    def test_invalid_email_returns_422(self, api):
        r = api.post(
            f"{BASE_URL}/api/waitlist",
            json={"email": "not-an-email"},
            timeout=20,
        )
        assert r.status_code == 422

    def test_waitlist_count(self, api):
        r = api.get(f"{BASE_URL}/api/waitlist/count", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0


# ---------------------------------------------------------------------------
# Stripe checkout
# ---------------------------------------------------------------------------
class TestCheckout:
    def test_create_session_valid_product(self, api, db):
        payload = {
            "product_id": "the-clear-120",
            "origin_url": BASE_URL,
            "quantity": 1,
        }
        r = api.post(f"{BASE_URL}/api/checkout/session", json=payload, timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and data["url"].startswith("https://checkout.stripe.com/"), data
        assert "session_id" in data and data["session_id"].startswith("cs_test_"), data

        # persistence check
        session_id = data["session_id"]
        # small settle delay
        time.sleep(0.5)
        tx = db.payment_transactions.find_one({"session_id": session_id})
        assert tx is not None, "payment_transactions row not persisted"
        assert tx["payment_status"] == "initiated"
        assert tx["amount"] == 349.0
        assert tx["currency"] == "dkk"
        assert tx["product_id"] == "the-clear-120"

        # stash for status test
        pytest.session_id = session_id

    def test_create_session_invalid_product_returns_400(self, api):
        r = api.post(
            f"{BASE_URL}/api/checkout/session",
            json={"product_id": "nope", "origin_url": BASE_URL},
            timeout=20,
        )
        assert r.status_code == 400

    def test_checkout_status_for_created_session(self, api):
        session_id = getattr(pytest, "session_id", None)
        if not session_id:
            pytest.skip("no session id from prior test")
        r = api.get(f"{BASE_URL}/api/checkout/status/{session_id}", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("status", "payment_status", "amount_total", "currency", "metadata"):
            assert key in data, f"missing key {key}: {data}"
        # amount_total from Stripe is in the smallest currency unit (øre) → 34900
        # but the checkout playbook returns "amount_total" as the amount as reported
        # by Stripe. Just check it's present and > 0.
        if data["amount_total"] is not None:
            assert data["amount_total"] > 0
        assert data["currency"] == "dkk"

    def test_checkout_status_unknown_session_returns_404(self, api):
        r = api.get(
            f"{BASE_URL}/api/checkout/status/cs_test_does_not_exist_xyz",
            timeout=20,
        )
        assert r.status_code == 404
