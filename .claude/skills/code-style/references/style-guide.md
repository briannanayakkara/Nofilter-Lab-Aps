# Style Guide

Derived from the current codebase — update this file when the repo's actual conventions change, don't let it drift into aspirational rules nobody follows.

## Backend (`backend/server.py`, FastAPI + Motor)

- **Env vars fail loud**: `os.environ["X"]`, never `os.environ.get("X", default)` for required config. A missing required var should crash at startup, not silently fall back.
- **Server-authoritative money**: prices, shipping costs, and totals are always computed server-side (`_compute_totals`) from the backend-defined `PRODUCTS` / `SHIPPING_OPTIONS` dicts. Never accept a client-sent amount and trust it.
- **Pydantic models**: use `ConfigDict(extra="ignore")` on request/response models so unknown client fields don't error.
- **Routes**: all `/api/*` routes go on `api_router` (an `APIRouter(prefix="/api")`), not directly on `app`.
- **IDs**: `str(uuid.uuid4())`, not Mongo's default `ObjectId` — keeps IDs JSON-serializable without a custom encoder.
- **Timestamps**: `datetime.now(timezone.utc)`, stored as `.isoformat()` strings in Mongo docs.
- **Rate limiting**: `slowapi` with a custom `_client_ip` key func that prefers `X-Forwarded-For` (ingress rewrites source IP) — reuse this for any new rate-limited endpoint, don't add a second key func.
- **Logging**: module-level `logger = logging.getLogger("nofilterlab")`; log full exception context on external calls (Stripe, email) rather than swallowing silently.

## Frontend (`frontend/src/`, React 19 + Tailwind + Craco)

- **Function components + hooks only** — no class components.
- **Cart state**: all of it goes through `context/CartContext.js`'s `useCart()`. Never read/write the `nfl.cart.v1` localStorage key directly from a component.
- **Cart init is synchronous**: `useState(readCart)` (function form), not `useState([])` + `useEffect` — this avoids a hydration race. Follow this pattern for any other localStorage-backed state.
- **Analytics**: all PostHog events go through `lib/analytics.js`'s wrapper functions, never `posthog.capture(...)` called directly from a component.
- **Styling**: Tailwind utility classes directly in JSX; `class-variance-authority` + `clsx`/`tailwind-merge` for variant components (see `components/ui/`), not separate CSS files.
- **File naming**: PascalCase for components (`BuyBlock.js`), matching the component name exported.
