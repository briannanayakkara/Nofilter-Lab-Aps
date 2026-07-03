from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, Dict
import uuid
from datetime import datetime, timezone

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest,
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Managed Resend / email proxy (constant per playbook)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]

STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]

# Fixed, backend-defined product catalog — never trust frontend prices
PRODUCTS: Dict[str, Dict] = {
    "the-clear-120": {
        "id": "the-clear-120",
        "name": "THE CLEAR — 120 ml",
        "amount": 349.00,        # 349 DKK (float per Stripe playbook)
        "currency": "dkk",
        "description": "Leave-on exfoliant with 2% BHA + Hyaluronic Acid",
    },
}

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Nofilter Lab API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("nofilterlab")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class WaitlistCreate(BaseModel):
    email: EmailStr
    source: Optional[str] = "footer"


class CheckoutCreate(BaseModel):
    product_id: str
    origin_url: str
    quantity: int = 1


# ---------------------------------------------------------------------------
# Basic status routes (kept from template)
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Nofilter Lab API"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(payload: StatusCheckCreate):
    obj = StatusCheck(**payload.model_dump())
    doc = obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return obj


# ---------------------------------------------------------------------------
# Waitlist
# ---------------------------------------------------------------------------
def _welcome_email_html() -> str:
    """Simple, dependable HTML email — inline styles, no external assets."""
    return """
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2EEE8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1F1F1F;">
      <tr><td align="center" style="padding:56px 24px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#F2EEE8;">
          <tr><td style="padding-bottom:40px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;opacity:0.55;">
            NOFILTER · LAB
          </td></tr>
          <tr><td style="font-size:36px;line-height:1.05;letter-spacing:-0.02em;font-weight:300;padding-bottom:20px;">
            You're on the list.
          </td></tr>
          <tr><td style="font-size:15px;line-height:1.6;opacity:0.8;padding-bottom:36px;">
            Thanks for signing up. THE CLEAR is a leave-on exfoliant with 2% BHA and Hyaluronic Acid — one bottle, two ingredients that matter. We'll email you the moment it ships.
          </td></tr>
          <tr><td style="border-top:1px solid rgba(31,31,31,0.15);padding-top:24px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.55;">
            Developed in Denmark
          </td></tr>
        </table>
      </td></tr>
    </table>
    """


async def _send_welcome_email(recipient: str) -> Optional[str]:
    payload = {
        "to": [recipient],
        "subject": "You're on the list — Nofilter Lab",
        "html": _welcome_email_html(),
        "from_name": EMAIL_FROM_NAME,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send HTTP error: {e.response.status_code} {e.response.text}")
        return None
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return None


@api_router.post("/waitlist")
async def waitlist_signup(payload: WaitlistCreate):
    email = payload.email.lower().strip()

    existing = await db.waitlist.find_one({"email": email}, {"_id": 0})
    if existing:
        return {
            "status": "already_subscribed",
            "message": "You're already on the list. We'll be in touch.",
        }

    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "source": payload.source or "footer",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.waitlist.insert_one(doc)

    email_id = await _send_welcome_email(email)

    return {
        "status": "subscribed",
        "message": "You're on the list.",
        "email_sent": bool(email_id),
    }


@api_router.get("/waitlist/count")
async def waitlist_count():
    count = await db.waitlist.count_documents({})
    return {"count": count}


# ---------------------------------------------------------------------------
# Stripe checkout
# ---------------------------------------------------------------------------
def _get_checkout(request: Request) -> StripeCheckout:
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = PRODUCTS.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Unknown product")
    return product


@api_router.post("/checkout/session")
async def create_checkout_session(payload: CheckoutCreate, request: Request):
    product = PRODUCTS.get(payload.product_id)
    if not product:
        raise HTTPException(status_code=400, detail="Invalid product")

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/?checkout=cancelled"

    metadata = {
        "product_id": product["id"],
        "product_name": product["name"],
        "source": "landing",
    }

    stripe = _get_checkout(request)
    checkout_request = CheckoutSessionRequest(
        amount=float(product["amount"]),
        currency=product["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    try:
        session: CheckoutSessionResponse = await stripe.create_checkout_session(checkout_request)
    except Exception as e:
        logger.error(f"Stripe create session failed: {e}")
        raise HTTPException(status_code=502, detail="Could not start checkout")

    tx_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "product_id": product["id"],
        "amount": product["amount"],
        "currency": product["currency"],
        "metadata": metadata,
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.insert_one(tx_doc)

    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Session not found")

    # If we already marked as paid, return cached — never double-process.
    if tx.get("payment_status") == "paid":
        return {
            "status": "complete",
            "payment_status": "paid",
            "amount_total": tx.get("amount"),
            "currency": tx.get("currency"),
            "metadata": tx.get("metadata", {}),
        }

    stripe = _get_checkout(request)
    try:
        status: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)
    except Exception as e:
        logger.error(f"Stripe get_checkout_status failed: {e}")
        raise HTTPException(status_code=502, detail="Could not check status")

    new_payment_status = status.payment_status
    update = {
        "payment_status": new_payment_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if new_payment_status == "paid" and tx.get("payment_status") != "paid":
        update["paid_at"] = datetime.now(timezone.utc).isoformat()

    await db.payment_transactions.update_one(
        {"session_id": session_id}, {"$set": update}
    )

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "metadata": status.metadata,
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    stripe = _get_checkout(request)
    try:
        event = await stripe.handle_webhook(body, signature)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")

    if event.session_id:
        await db.payment_transactions.update_one(
            {"session_id": event.session_id},
            {
                "$set": {
                    "payment_status": event.payment_status or "unknown",
                    "webhook_event_id": event.event_id,
                    "webhook_event_type": event.event_type,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
    return {"received": True}


# ---------------------------------------------------------------------------
# Mount
# ---------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
