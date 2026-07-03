import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { analytics } from "../lib/analytics";

const EASE = [0.16, 1, 0.3, 1];
const API = process.env.REACT_APP_BACKEND_URL;

const emptyShipping = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  postal_code: "",
  country: "DK",
};

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

const StepBadge = ({ n, label, active, done }) => (
  <div className="flex items-center gap-3">
    <span
      className={`h-7 w-7 rounded-full border flex items-center justify-center font-mono text-[11px] tabular-nums transition-colors duration-500 ${
        done
          ? "bg-[#F2EEE8] text-[#1F1F1F] border-[#F2EEE8]"
          : active
          ? "border-[#F2EEE8] text-[#F2EEE8]"
          : "border-white/25 text-white/40"
      }`}
    >
      {done ? <Check className="h-3 w-3" strokeWidth={1.5} /> : n}
    </span>
    <span
      className={`font-mono text-[11px] uppercase tracking-[0.28em] transition-opacity ${
        active || done ? "opacity-90" : "opacity-40"
      }`}
    >
      {label}
    </span>
  </div>
);

export default function Checkout() {
  const navigate = useNavigate();
  const { items, primaryItem, subtotal, totalQuantity, clear } = useCart();

  const [step, setStep] = useState(1); // 1: shipping, 2: review, 3: payment (redirect)
  const [shipping, setShipping] = useState(emptyShipping);
  const [quote, setQuote] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Bounce to home if the cart is empty
  useEffect(() => {
    if (items.length === 0 && !redirecting) {
      navigate("/", { replace: true });
    }
  }, [items.length, navigate, redirecting]);

  // Fetch server-side quote whenever quantity changes
  useEffect(() => {
    if (!primaryItem) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${API}/api/checkout/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: primaryItem.product_id,
            origin_url: window.location.origin,
            quantity: primaryItem.quantity,
            shipping_option: "standard",
          }),
        });
        const data = await resp.json();
        if (!cancelled && resp.ok) setQuote(data);
      } catch (_e) { /* quote endpoint unreachable */ }
    })();
    return () => {
      cancelled = true;
    };
  }, [primaryItem]);

  const validateShipping = () => {
    const err = {};
    if (!shipping.first_name.trim()) err.first_name = "Required";
    if (!shipping.last_name.trim()) err.last_name = "Required";
    if (!isEmail(shipping.email.trim())) err.email = "Invalid email";
    if (!shipping.line1.trim()) err.line1 = "Required";
    if (!shipping.city.trim()) err.city = "Required";
    if (!shipping.postal_code.trim()) err.postal_code = "Required";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const goStep2 = () => {
    if (!validateShipping()) return;
    analytics.checkoutStep("shipping_complete");
    setStep(2);
  };

  const goStep1 = () => setStep(1);

  const goPay = async () => {
    if (!primaryItem) return;
    setSubmitting(true);
    setRedirecting(true);
    analytics.checkoutStep("proceed_to_payment", { total: quote?.total });
    try {
      const resp = await fetch(`${API}/api/checkout/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: primaryItem.product_id,
          origin_url: window.location.origin,
          quantity: primaryItem.quantity,
          shipping_option: "standard",
          shipping: { ...shipping, phone: shipping.phone || null, line2: shipping.line2 || null },
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.url) throw new Error(data.detail || "Checkout failed");
      // Preserve cart until Stripe redirects back with success; the cart is
      // cleared by the Success page once we confirm the payment.
      window.location.href = data.url;
    } catch (err) {
      setSubmitting(false);
      setRedirecting(false);
      setErrors({ submit: err.message || "Could not start payment" });
    }
  };

  const currency = quote?.currency?.toUpperCase() || "DKK";
  const formatDKK = (n) =>
    (n ?? 0).toLocaleString("da-DK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-[#1F1F1F] text-[#F2EEE8]" data-testid="checkout-page">
      {/* Nav */}
      <header className="px-6 md:px-10 lg:px-16 py-8 flex items-center justify-between border-b border-white/10">
        <Link to="/" className="flex items-center gap-2" data-testid="checkout-logo-home">
          <img src="/assets/logo-white.svg" alt="Nofilter Lab" className="h-[18px] w-auto" />
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-60">
          Checkout · Secure
        </p>
      </header>

      <main className="px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <div className="max-w-[1400px] mx-auto">
          {/* Step indicator */}
          <div
            className="flex items-center gap-4 md:gap-10 mb-14 md:mb-20 flex-wrap"
            data-testid="checkout-stepper"
          >
            <StepBadge n="1" label="Shipping" active={step === 1} done={step > 1} />
            <span className="h-px w-6 md:w-16 bg-white/20" />
            <StepBadge n="2" label="Review" active={step === 2} done={step > 2} />
            <span className="h-px w-6 md:w-16 bg-white/20" />
            <StepBadge n="3" label="Payment" active={step === 3} done={false} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-20">
            {/* Main column */}
            <div className="lg:col-span-7">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    data-testid="checkout-step-shipping"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-55 mb-4">
                      01 · Where should we send it?
                    </p>
                    <h1 className="font-display font-light text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] leading-[0.98]">
                      Shipping details.
                    </h1>

                    <div className="mt-12 grid grid-cols-2 gap-6">
                      <Field
                        label="First name"
                        testid="ship-first-name"
                        value={shipping.first_name}
                        onChange={(v) => setShipping((s) => ({ ...s, first_name: v }))}
                        error={errors.first_name}
                      />
                      <Field
                        label="Last name"
                        testid="ship-last-name"
                        value={shipping.last_name}
                        onChange={(v) => setShipping((s) => ({ ...s, last_name: v }))}
                        error={errors.last_name}
                      />
                      <Field
                        col={2}
                        label="Email"
                        type="email"
                        testid="ship-email"
                        value={shipping.email}
                        onChange={(v) => setShipping((s) => ({ ...s, email: v }))}
                        error={errors.email}
                      />
                      <Field
                        col={2}
                        label="Phone (optional)"
                        type="tel"
                        testid="ship-phone"
                        value={shipping.phone}
                        onChange={(v) => setShipping((s) => ({ ...s, phone: v }))}
                      />
                      <Field
                        col={2}
                        label="Address"
                        testid="ship-line1"
                        value={shipping.line1}
                        onChange={(v) => setShipping((s) => ({ ...s, line1: v }))}
                        error={errors.line1}
                      />
                      <Field
                        col={2}
                        label="Apartment, suite, etc. (optional)"
                        testid="ship-line2"
                        value={shipping.line2}
                        onChange={(v) => setShipping((s) => ({ ...s, line2: v }))}
                      />
                      <Field
                        label="City"
                        testid="ship-city"
                        value={shipping.city}
                        onChange={(v) => setShipping((s) => ({ ...s, city: v }))}
                        error={errors.city}
                      />
                      <Field
                        label="Postal code"
                        testid="ship-postal-code"
                        value={shipping.postal_code}
                        onChange={(v) => setShipping((s) => ({ ...s, postal_code: v }))}
                        error={errors.postal_code}
                      />
                      <div className="col-span-2">
                        <label className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-55">
                          Country
                        </label>
                        <select
                          value={shipping.country}
                          onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
                          data-testid="ship-country"
                          className="mt-3 w-full bg-transparent border-b border-white/25 focus:border-[#F2EEE8] outline-none py-3 text-base font-display font-light appearance-none transition-colors"
                        >
                          <option value="DK" className="bg-[#1F1F1F]">Denmark</option>
                          <option value="SE" className="bg-[#1F1F1F]">Sweden</option>
                          <option value="NO" className="bg-[#1F1F1F]">Norway</option>
                          <option value="DE" className="bg-[#1F1F1F]">Germany</option>
                          <option value="NL" className="bg-[#1F1F1F]">Netherlands</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-14 flex flex-col-reverse md:flex-row items-stretch md:items-center gap-4 md:gap-8">
                      <Link
                        to="/"
                        data-testid="checkout-back-to-shop"
                        className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-60 hover:opacity-100 transition-opacity inline-flex items-center gap-2"
                      >
                        <ArrowLeft className="h-3 w-3" strokeWidth={1.25} /> Back to shop
                      </Link>
                      <button
                        type="button"
                        onClick={goStep2}
                        data-testid="checkout-next-review"
                        className="ml-auto inline-flex items-center justify-center gap-4 border border-[#F2EEE8]/40 hover:border-[#F2EEE8] px-8 py-5 transition-colors duration-500 group"
                      >
                        <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Continue to review</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" strokeWidth={1.25} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    data-testid="checkout-step-review"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-55 mb-4">
                      02 · One last look.
                    </p>
                    <h1 className="font-display font-light text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] leading-[0.98]">
                      Review your order.
                    </h1>

                    <section className="mt-14 border-t border-white/12 pt-8">
                      <div className="flex items-baseline justify-between mb-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-55">
                          Shipping to
                        </p>
                        <button
                          type="button"
                          onClick={goStep1}
                          data-testid="checkout-edit-shipping"
                          className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-60 hover:opacity-100 transition-opacity"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="text-base leading-relaxed opacity-85 space-y-1" data-testid="review-address">
                        <p>{shipping.first_name} {shipping.last_name}</p>
                        <p className="opacity-70">{shipping.line1}{shipping.line2 ? `, ${shipping.line2}` : ""}</p>
                        <p className="opacity-70">
                          {shipping.postal_code} {shipping.city}, {shipping.country}
                        </p>
                        <p className="opacity-60 text-sm mt-3">{shipping.email}{shipping.phone ? ` · ${shipping.phone}` : ""}</p>
                      </div>
                    </section>

                    <section className="mt-10 border-t border-white/12 pt-8">
                      <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-55 mb-4">Delivery</p>
                      <p className="text-base opacity-85">Standard shipping · 2–4 business days</p>
                      <p className="text-sm opacity-60 mt-1">
                        {quote?.shipping === 0 ? "Free" : `${formatDKK(quote?.shipping)} ${currency}`}
                      </p>
                    </section>

                    {errors.submit && (
                      <p className="mt-8 text-sm text-red-300/90" data-testid="checkout-error">{errors.submit}</p>
                    )}

                    <div className="mt-14 flex flex-col-reverse md:flex-row items-stretch md:items-center gap-4 md:gap-8">
                      <button
                        type="button"
                        onClick={goStep1}
                        data-testid="checkout-back-shipping"
                        className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-60 hover:opacity-100 transition-opacity inline-flex items-center gap-2"
                      >
                        <ArrowLeft className="h-3 w-3" strokeWidth={1.25} /> Edit shipping
                      </button>
                      <button
                        type="button"
                        onClick={goPay}
                        disabled={submitting}
                        data-testid="checkout-pay"
                        className="ml-auto inline-flex items-center justify-center gap-4 bg-[#F2EEE8] text-[#1F1F1F] px-8 py-5 hover:bg-white transition-colors duration-500 group disabled:opacity-60"
                      >
                        <span className="font-mono text-[11px] uppercase tracking-[0.3em]">
                          {submitting ? "Opening secure payment" : `Pay ${formatDKK(quote?.total)} ${currency}`}
                        </span>
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.25} />
                        ) : (
                          <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" strokeWidth={1.25} />
                        )}
                      </button>
                    </div>
                    <p className="mt-6 text-xs opacity-50 max-w-[52ch]">
                      You&apos;ll enter your card on our secure payment provider (Stripe).
                      Your details never touch our servers.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Order summary — always visible right column */}
            <aside className="lg:col-span-5" data-testid="checkout-summary">
              <div className="border border-white/10 p-8 md:p-10 sticky top-24 bg-white/[0.02]">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-55 mb-6">
                  Order summary
                </p>

                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex gap-4 items-start">
                      <div className="w-16 h-20 bg-white/[0.05] flex items-center justify-center shrink-0">
                        <img src={item.image} alt={item.name} className="max-h-[85%] max-w-[70%] object-contain" draggable={false} />
                      </div>
                      <div className="flex-1">
                        <p className="font-display text-base font-light">{item.name}</p>
                        <p className="text-xs opacity-55 mt-0.5">{item.subtitle}</p>
                        <p className="text-xs opacity-55 mt-2">Qty {item.quantity}</p>
                      </div>
                      <p className="font-display text-base font-light tabular-nums">
                        {(item.unit_price * item.quantity).toLocaleString("da-DK")}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-10 space-y-3 border-t border-white/10 pt-6 text-sm">
                  <div className="flex justify-between opacity-80">
                    <span>Subtotal</span>
                    <span className="tabular-nums" data-testid="summary-subtotal">{formatDKK(quote?.subtotal ?? subtotal)} {currency}</span>
                  </div>
                  <div className="flex justify-between opacity-80">
                    <span>Shipping</span>
                    <span className="tabular-nums" data-testid="summary-shipping">
                      {quote?.shipping === 0 ? "Free" : `${formatDKK(quote?.shipping)} ${currency}`}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-baseline">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-70">Total</span>
                  <span className="font-display font-light text-3xl tabular-nums" data-testid="summary-total">
                    {formatDKK(quote?.total ?? subtotal)}{" "}
                    <span className="text-sm opacity-55">{currency}</span>
                  </span>
                </div>

                <p className="mt-8 text-xs opacity-55 leading-relaxed">
                  {totalQuantity} item{totalQuantity > 1 ? "s" : ""} · Ships from Denmark ·
                  Free shipping over 400 DKK
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <footer className="px-6 md:px-10 lg:px-16 py-8 font-mono text-[10px] uppercase tracking-[0.25em] opacity-45 flex justify-between border-t border-white/10 mt-16">
        <span>© {new Date().getFullYear()} Nofilter Lab</span>
        <span>Made in Denmark</span>
      </footer>
    </div>
  );
}

const Field = ({ label, type = "text", value, onChange, error, testid, col = 1 }) => {
  const wrapCls = useMemo(() => (col === 2 ? "col-span-2" : ""), [col]);
  return (
    <div className={wrapCls}>
      <label className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-55">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        autoComplete={type === "email" ? "email" : "on"}
        className={`mt-3 w-full bg-transparent border-b outline-none py-3 text-base font-display font-light transition-colors ${
          error ? "border-red-400/70 focus:border-red-300" : "border-white/25 focus:border-[#F2EEE8]"
        }`}
      />
      {error && (
        <p className="mt-2 text-[11px] text-red-300/80" data-testid={`${testid}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};
