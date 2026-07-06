import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { analytics } from "../lib/analytics";
import { buildCheckoutUrl, isShopifyConfigured } from "../lib/shopify";

const EASE = [0.16, 1, 0.3, 1];

const CartDrawer = () => {
  const {
    items,
    subtotal,
    setQuantity,
    removeItem,
    drawerOpen,
    closeDrawer,
    totalQuantity,
  } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  const goCheckout = async () => {
    const first = items[0];
    if (!first) return;

    if (!isShopifyConfigured()) {
      toast.error("Shopify isn't connected yet.", {
        description: "See guide.html to connect your store.",
      });
      return;
    }

    analytics.beginCheckout({
      product_id: first.product_id,
      quantity: totalQuantity,
      total: subtotal,
      currency: first.currency,
    });

    setCheckingOut(true);
    try {
      const url = await buildCheckoutUrl({ quantity: totalQuantity });
      window.location.href = url;
    } catch (e) {
      toast.error("Couldn't start checkout.", { description: e.message });
      setCheckingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div
          className="fixed inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          data-testid="cart-drawer"
        >
          <motion.button
            aria-label="Close cart"
            onClick={closeDrawer}
            data-testid="cart-scrim"
            className="absolute inset-0 bg-[#1F1F1F]/50 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-label="Bag"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.55, ease: EASE }}
            className="absolute top-0 right-0 h-full w-full max-w-[480px] bg-[#F2EEE8] text-[#1F1F1F] flex flex-col shadow-[-40px_0_80px_rgba(0,0,0,0.15)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-7 border-b border-[#1F1F1F]/10">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-55">Your bag</p>
                <p className="font-display font-light text-2xl mt-1">
                  {totalQuantity === 0 ? "Empty" : `${totalQuantity} item${totalQuantity > 1 ? "s" : ""}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                data-testid="cart-close"
                className="p-2 -m-2 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={1.25} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
              {items.length === 0 && (
                <div className="text-center py-16 opacity-55">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] mb-6">Nothing here yet</p>
                  <p className="text-sm max-w-[28ch] mx-auto leading-relaxed">
                    Add THE CLEAR to your bag to start.
                  </p>
                </div>
              )}
              {items.map((item, i) => (
                <motion.div
                  key={item.product_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: i * 0.05 }}
                  className="flex gap-5"
                  data-testid={`cart-item-${item.product_id}`}
                >
                  <div className="w-24 h-32 bg-[#1F1F1F]/[0.04] flex items-center justify-center shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-h-[90%] max-w-[70%] object-contain"
                      draggable={false}
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-display text-lg font-light tracking-[-0.01em]">{item.name}</p>
                        <p className="text-xs opacity-60 mt-1">{item.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product_id)}
                        data-testid={`cart-remove-${item.product_id}`}
                        className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-50 hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#1F1F1F]/20">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.product_id, item.quantity - 1)}
                          data-testid={`cart-qty-decrement-${item.product_id}`}
                          className="p-2.5 hover:bg-[#1F1F1F]/[0.05] transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" strokeWidth={1.25} />
                        </button>
                        <span
                          className="w-9 text-center font-mono text-sm tabular-nums"
                          data-testid={`cart-qty-${item.product_id}`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.product_id, item.quantity + 1)}
                          data-testid={`cart-qty-increment-${item.product_id}`}
                          disabled={item.quantity >= 5}
                          className="p-2.5 hover:bg-[#1F1F1F]/[0.05] transition-colors disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" strokeWidth={1.25} />
                        </button>
                      </div>
                      <p className="font-display text-lg font-light tabular-nums">
                        {(item.unit_price * item.quantity).toLocaleString("da-DK")}{" "}
                        <span className="text-xs opacity-55">{item.currency}</span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer / totals */}
            {items.length > 0 && (
              <div className="border-t border-[#1F1F1F]/10 px-8 py-6 space-y-5">
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-55">Subtotal</span>
                  <span className="font-display text-2xl font-light tabular-nums" data-testid="cart-subtotal">
                    {subtotal.toLocaleString("da-DK")}{" "}
                    <span className="text-sm opacity-55">DKK</span>
                  </span>
                </div>
                <p className="text-xs opacity-55 leading-relaxed">
                  Shipping calculated at checkout · Free over 400 DKK
                </p>
                <button
                  type="button"
                  onClick={goCheckout}
                  disabled={checkingOut}
                  data-testid="cart-checkout-cta"
                  className="w-full inline-flex items-center justify-center gap-4 bg-[#1F1F1F] text-[#F2EEE8] px-8 py-5 hover:bg-black transition-colors duration-500 group disabled:opacity-60"
                >
                  {checkingOut ? (
                    <>
                      <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Redirecting…</span>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.25} />
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Check out</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" strokeWidth={1.25} />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  data-testid="cart-continue-shopping"
                  className="w-full font-mono text-[11px] uppercase tracking-[0.28em] opacity-60 hover:opacity-100 transition-opacity py-2"
                >
                  Continue browsing
                </button>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
