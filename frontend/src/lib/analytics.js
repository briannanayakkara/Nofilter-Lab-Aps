/**
 * Analytics — thin PostHog wrapper.
 * PostHog is already loaded via /public/index.html so we just call it if present.
 * Never blocks user flow, never throws — analytics is best-effort.
 */
const safeCapture = (event, properties = {}) => {
  try {
    if (typeof window === "undefined") return;
    if (window.posthog && typeof window.posthog.capture === "function") {
      window.posthog.capture(event, properties);
    }
  } catch (_) {
    /* noop */
  }
};

export const analytics = {
  viewHero: () => safeCapture("view_hero", { page: "landing" }),
  viewItem: (product) =>
    safeCapture("view_item", {
      product_id: product?.id,
      product_name: product?.name,
      price: product?.amount,
      currency: product?.currency,
    }),
  addToCart: ({ product_id, quantity, subtotal, currency }) =>
    safeCapture("add_to_cart", { product_id, quantity, subtotal, currency }),
  beginCheckout: ({ product_id, quantity, total, currency }) =>
    safeCapture("begin_checkout", { product_id, quantity, total, currency }),
  checkoutStep: (step, extra = {}) =>
    safeCapture("checkout_step", { step, ...extra }),
  signUp: ({ email, source }) =>
    safeCapture("sign_up", { source, has_email: !!email }),
  purchase: ({ session_id, amount_total, currency }) =>
    safeCapture("purchase", { session_id, amount_total, currency }),
};
