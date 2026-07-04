# Data Models

Pydantic models from `backend/server.py`. All use `ConfigDict(extra="ignore")` unless noted.

## `WaitlistCreate` (request — `POST /api/waitlist`)
- `email: EmailStr`
- `source: Optional[str] = "footer"`

## `ShippingAddress` (nested in `CheckoutCreate`)
- `first_name: str`, `last_name: str`
- `email: EmailStr`
- `phone: Optional[str]`
- `line1: str`, `line2: Optional[str]`
- `city: str`, `postal_code: str`
- `country: str = "DK"`

## `CheckoutCreate` (request — `POST /api/checkout/quote`, `POST /api/checkout/session`)
- `product_id: str`
- `origin_url: str` — used to build Stripe `success_url`/`cancel_url`
- `quantity: int = 1` (validated 1–5 in the route handler, not the model)
- `shipping: Optional[ShippingAddress] = None`
- `shipping_option: str = "standard"`

## `StatusCheck` / `StatusCheckCreate`
- `StatusCheck`: `id` (uuid, default factory), `client_name: str`, `timestamp` (UTC, default factory)
- `StatusCheckCreate`: `client_name: str`

## Backend-defined catalogs (not client-editable)

`PRODUCTS: Dict[str, Dict]` — currently one SKU, `the-clear-120`: `id`, `name`, `amount` (349.00 DKK), `currency`, `description`.

`SHIPPING_OPTIONS: Dict[str, Dict]` — currently one option, `standard`: `id`, `label`, `eta`, `amount` (39.00 DKK), `free_over` (400.00 DKK).

## Mongo document shapes (not Pydantic, built as plain dicts)

- `payment_transactions`: `id`, `session_id`, `product_id`, `quantity`, `shipping_option`, `subtotal`, `shipping_cost`, `amount`, `currency`, `metadata` (dict, also mirrors flattened shipping fields for Stripe's 500-char metadata value limit), `shipping_address` (full `ShippingAddress` dump or `None`), `payment_status` (`initiated` → `paid`, polled/updated via `/checkout/status`), `created_at`, `updated_at`.
- `waitlist`: `id`, `email`, `source`, `created_at`.
