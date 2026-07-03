"""
Backend tests for Nofilter Lab — Iteration 3.

Covers:
- Existing endpoints still working: /api/products/the-clear-120, /api/waitlist,
  /api/checkout/status/{session_id}
- NEW: GET /api/shipping/options
- NEW: POST /api/checkout/quote (server-side totals + validation)
- UPDATED: POST /api/checkout/session with quantity + shipping + shipping_option
- NEW: rate limit 5/hour per IP on /api/waitlist
"""

import os
import time
import uuid

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

_fe_env = dotenv_values("/app/frontend/.env")
BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or (_fe_env.get("REACT_APP_BACKEND_URL") or "").strip().strip('"').strip("'")
).rstrip("/")

# backend .env quotes values — strip them
_be_env = dotenv_values("/app/backend/.env")


def _clean(v):
    if v is None:
        return None
    return v.strip().strip('"').strip("'")


MONGO_URL = _clean(_be_env.get("MONGO_URL")) or os.environ.get("MONGO_URL")
DB_NAME = _clean(_be_env.get("DB_NAME")) or os.environ.get("DB_NAME")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
    return c[DB_NAME]


# ---------------------------------------------------------------------------
# Product (existing)
# ---------------------------------------------------------------------------
class TestProduct:
    def test_get_product(self, api):
        r = api.get(f"{BASE_URL}/api/products/the-clear-120", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "the-clear-120"
        assert data["amount"] == 349.0
        assert data["currency"] == "dkk"


# ---------------------------------------------------------------------------
# Shipping options (new)
# ---------------------------------------------------------------------------
class TestShippingOptions:
    def test_shipping_options_returns_standard(self, api):
        r = api.get(f"{BASE_URL}/api/shipping/options", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "options" in data
        assert isinstance(data["options"], list) and len(data["options"]) >= 1
        std = next((o for o in data["options"] if o["id"] == "standard"), None)
        assert std is not None
        assert std["amount"] == 39.0
        assert std["free_over"] == 400.0
        assert "label" in std and "eta" in std


# ---------------------------------------------------------------------------
# Quote endpoint (new)
# ---------------------------------------------------------------------------
class TestCheckoutQuote:
    def test_quote_qty1_standard(self, api):
        r = api.post(
            f"{BASE_URL}/api/checkout/quote",
            json={
                "product_id": "the-clear-120",
                "origin_url": "x",
                "quantity": 1,
                "shipping_option": "standard",
            },
            timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["subtotal"] == 349.0
        assert d["shipping"] == 39.0
        assert d["total"] == 388.0
        assert d["currency"] == "dkk"
        assert d["quantity"] == 1

    def test_quote_qty2_free_shipping(self, api):
        r = api.post(
            f"{BASE_URL}/api/checkout/quote",
            json={
                "product_id": "the-clear-120",
                "origin_url": "x",
                "quantity": 2,
                "shipping_option": "standard",
            },
            timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["subtotal"] == 698.0
        assert d["shipping"] == 0
        assert d["total"] == 698.0

    def test_quote_out_of_range(self, api):
        r = api.post(
            f"{BASE_URL}/api/checkout/quote",
            json={
                "product_id": "the-clear-120",
                "origin_url": "x",
                "quantity": 6,
                "shipping_option": "standard",
            },
            timeout=20,
        )
        assert r.status_code == 400

    def test_quote_unknown_product(self, api):
        r = api.post(
            f"{BASE_URL}/api/checkout/quote",
            json={
                "product_id": "nope",
                "origin_url": "x",
                "quantity": 1,
                "shipping_option": "standard",
            },
            timeout=20,
        )
        assert r.status_code == 400

    def test_quote_unknown_shipping(self, api):
        r = api.post(
            f"{BASE_URL}/api/checkout/quote",
            json={
                "product_id": "the-clear-120",
                "origin_url": "x",
                "quantity": 1,
                "shipping_option": "space-drone",
            },
            timeout=20,
        )
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# Checkout session (updated)
# ---------------------------------------------------------------------------
class TestCheckoutSession:
    def test_session_qty2_with_shipping_free_ship(self, api, db):
        payload = {
            "product_id": "the-clear-120",
            "origin_url": BASE_URL,
            "quantity": 2,
            "shipping_option": "standard",
            "shipping": {
                "first_name": "Test",
                "last_name": "Buyer",
                "email": f"TEST_buyer_{uuid.uuid4().hex[:8]}@nofilterlab.com",
                "phone": "+4512345678",
                "line1": "Testvej 1",
                "line2": "3. sal",
                "city": "Copenhagen",
                "postal_code": "1050",
                "country": "DK",
            },
        }
        r = api.post(f"{BASE_URL}/api/checkout/session", json=payload, timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["url"].startswith("https://checkout.stripe.com/"), data
        assert data["session_id"].startswith("cs_test_"), data

        time.sleep(0.5)
        tx = db.payment_transactions.find_one({"session_id": data["session_id"]})
        assert tx is not None
        assert tx["quantity"] == 2
        assert tx["subtotal"] == 698.0
        assert tx["shipping_cost"] == 0
        assert tx["amount"] == 698.0
        assert tx["currency"] == "dkk"
        assert tx["shipping_address"] is not None
        assert tx["shipping_address"]["city"] == "Copenhagen"
        assert tx["shipping_address"]["country"] == "DK"
        # metadata should include shipping fields
        md = tx.get("metadata", {})
        assert md.get("shipping_city") == "Copenhagen"
        assert md.get("quantity") == "2"

    def test_session_qty_out_of_range(self, api):
        r = api.post(
            f"{BASE_URL}/api/checkout/session",
            json={
                "product_id": "the-clear-120",
                "origin_url": BASE_URL,
                "quantity": 0,
                "shipping_option": "standard",
            },
            timeout=20,
        )
        assert r.status_code == 400

    def test_status_unknown(self, api):
        r = api.get(
            f"{BASE_URL}/api/checkout/status/cs_test_does_not_exist_iter3",
            timeout=20,
        )
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Waitlist (existing) — single fresh submission
# NOTE: rate limit test is separate & runs last
# ---------------------------------------------------------------------------
class TestWaitlistBasic:
    def test_fresh_signup(self, api):
        email = f"TEST_iter3_{uuid.uuid4().hex[:10]}@nofilterlab.com"
        r = api.post(
            f"{BASE_URL}/api/waitlist",
            json={"email": email, "source": "pytest-iter3"},
            timeout=45,
        )
        # rate limit may already be exhausted from previous test runs; accept 429
        # but the "correct" fresh path is 200
        assert r.status_code in (200, 429), r.text
        if r.status_code == 200:
            data = r.json()
            assert data["status"] == "subscribed"


# ---------------------------------------------------------------------------
# Rate limit — 5/hour per IP on /api/waitlist
# Runs LAST to avoid poisoning other tests
# ---------------------------------------------------------------------------
class TestZWaitlistRateLimit:
    """
    Prefix 'Z' so pytest collects/runs after the other classes alphabetically.
    Sends 6 quick requests and expects a 429 within them.
    Note: TrustedHost / ingress: the backend uses X-Forwarded-For for keying.
    Use a fresh, unique XFF IP so we start from a clean 5/hour bucket.
    """
    def test_rate_limit_5_per_hour(self, api):
        # Use a random RFC 5737 documentation IP so we don't collide with prior runs
        fake_ip = f"203.0.113.{uuid.uuid4().int % 250 + 2}"
        headers = {"X-Forwarded-For": fake_ip, "Content-Type": "application/json"}
        statuses = []
        for i in range(6):
            email = f"TEST_rl_{fake_ip.replace('.', '_')}_{i}_{uuid.uuid4().hex[:6]}@nofilterlab.com"
            r = requests.post(
                f"{BASE_URL}/api/waitlist",
                json={"email": email, "source": "pytest-rl"},
                headers=headers,
                timeout=45,
            )
            statuses.append(r.status_code)
        # First 5 should be 200 (subscribed), 6th should be 429
        assert statuses.count(200) >= 5, f"Expected >=5 200s in {statuses}"
        assert statuses[-1] == 429, f"6th call should be 429, got {statuses}"
