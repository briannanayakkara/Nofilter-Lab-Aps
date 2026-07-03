import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Check, ArrowLeft, Loader2 } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1];
const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Polls checkout status up to 5 times. Playbook mandates this because there
 * is no server webhook receiver on the client — polling is the only way.
 */
export default function Success() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState({ status: "polling", attempts: 0 });
  const timerRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setState({ status: "missing", attempts: 0 });
      return;
    }

    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      attempts += 1;
      try {
        const resp = await fetch(`${API}/api/checkout/status/${sessionId}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (cancelled) return;

        if (data.payment_status === "paid") {
          setState({ status: "paid", attempts, data });
          return;
        }
        if (data.status === "expired") {
          setState({ status: "expired", attempts });
          return;
        }
        if (attempts >= 5) {
          setState({ status: "timeout", attempts });
          return;
        }
        setState({ status: "polling", attempts });
        timerRef.current = setTimeout(poll, 2000);
      } catch (err) {
        if (attempts >= 5) {
          setState({ status: "error", attempts, error: err.message });
        } else {
          timerRef.current = setTimeout(poll, 2000);
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId]);

  const isPaid = state.status === "paid";
  const isPolling = state.status === "polling";

  return (
    <div className="min-h-screen bg-[#1F1F1F] text-[#F2EEE8] flex flex-col" data-testid="success-page">
      {/* Nav bar */}
      <header className="px-6 md:px-10 lg:px-16 py-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="success-back-home">
          <img src="/assets/logo-white.svg" alt="Nofilter Lab" className="h-[18px] w-auto" />
        </Link>
        <Link
          to="/"
          className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-70 hover:opacity-100 transition-opacity duration-500 inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.25} />
          Back home
        </Link>
      </header>

      <main className="flex-1 flex items-center px-6 md:px-10 lg:px-16">
        <div className="max-w-[900px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-10">
              Order · {sessionId ? sessionId.slice(-8) : "—"}
            </p>

            {isPolling && (
              <>
                <div className="flex items-center gap-4 mb-8" data-testid="success-status-polling">
                  <Loader2 className="h-6 w-6 animate-spin opacity-70" strokeWidth={1.25} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-70">
                    Confirming payment · attempt {state.attempts}/5
                  </span>
                </div>
                <h1 className="font-display font-light text-5xl md:text-7xl leading-[0.98] tracking-[-0.03em] max-w-[16ch]">
                  Just a moment.
                </h1>
                <p className="mt-6 opacity-70 max-w-[42ch] leading-relaxed">
                  We&apos;re confirming your payment with Stripe. This usually takes a couple of seconds.
                </p>
              </>
            )}

            {isPaid && (
              <>
                <div className="flex items-center gap-4 mb-8" data-testid="success-status-paid">
                  <span className="h-9 w-9 rounded-full border border-white/30 flex items-center justify-center">
                    <Check className="h-4 w-4" strokeWidth={1.25} />
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-70">
                    Payment confirmed
                  </span>
                </div>
                <h1 className="font-display font-light text-5xl md:text-7xl leading-[0.98] tracking-[-0.03em]">
                  Thank you.
                </h1>
                <p className="mt-6 opacity-75 max-w-[46ch] leading-relaxed">
                  Your bottle of THE CLEAR is on its way. We&apos;ll email you a confirmation and tracking as soon as it ships from Denmark.
                </p>
                {state.data?.amount_total && (
                  <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.28em] opacity-55">
                    Charged {state.data.amount_total} {state.data.currency?.toUpperCase()}
                  </p>
                )}
              </>
            )}

            {state.status === "expired" && (
              <>
                <h1 className="font-display font-light text-5xl md:text-7xl leading-[0.98] tracking-[-0.03em]">
                  Session expired.
                </h1>
                <p className="mt-6 opacity-70 max-w-[42ch] leading-relaxed">
                  Your checkout window timed out. Head back and try again — nothing was charged.
                </p>
              </>
            )}

            {(state.status === "timeout" || state.status === "error") && (
              <>
                <h1 className="font-display font-light text-5xl md:text-7xl leading-[0.98] tracking-[-0.03em]">
                  Still confirming.
                </h1>
                <p className="mt-6 opacity-70 max-w-[42ch] leading-relaxed">
                  We can&apos;t verify the status right now. If you completed the payment, you&apos;ll receive an email shortly. Otherwise please try again.
                </p>
              </>
            )}

            {state.status === "missing" && (
              <>
                <h1 className="font-display font-light text-5xl md:text-7xl leading-[0.98] tracking-[-0.03em]">
                  Nothing to show.
                </h1>
                <p className="mt-6 opacity-70 max-w-[42ch] leading-relaxed">
                  We didn&apos;t receive a checkout reference. Head back and try again.
                </p>
              </>
            )}

            <Link
              to="/"
              data-testid="success-return-cta"
              className="mt-14 inline-flex items-center gap-4 border border-[#F2EEE8]/30 hover:border-[#F2EEE8] transition-colors duration-500 px-8 py-5 group"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Back to Nofilter Lab</span>
              <ArrowLeft className="h-3 w-3 transition-transform duration-500 group-hover:-translate-x-2 rotate-180" strokeWidth={1.25} />
            </Link>
          </motion.div>
        </div>
      </main>

      <footer className="px-6 md:px-10 lg:px-16 py-8 font-mono text-[10px] uppercase tracking-[0.25em] opacity-50 flex justify-between">
        <span>© {new Date().getFullYear()} Nofilter Lab</span>
        <span>Made in Denmark</span>
      </footer>
    </div>
  );
}
