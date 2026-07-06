import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Plus, Minus, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { analytics } from "../lib/analytics";

const EASE = [0.16, 1, 0.3, 1];

const BuyBlock = () => {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const buyRef = useRef(null);
  const viewFired = useRef(false);

  // Fire view_item once when the buy block becomes visible
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !viewFired.current) {
            viewFired.current = true;
            analytics.viewItem({
              id: "the-clear-120",
              name: "THE CLEAR — 120 ml",
              amount: 349,
              currency: "DKK",
            });
          }
        });
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleAddToBag = () => {
    addItem({ quantity: qty });
    analytics.addToCart({
      product_id: "the-clear-120",
      quantity: qty,
      subtotal: qty * 349,
      currency: "DKK",
    });
    toast("Added to bag.", { description: `${qty} × THE CLEAR` });
  };

  return (
    <section
      id="buy"
      ref={buyRef}
      data-testid="section-buy"
      className="relative py-32 md:py-48 px-6 md:px-10 lg:px-16 border-t border-white/10"
    >
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1.1, ease: EASE }}
          className="border-t border-white/12 pt-12"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-6">
            Shop · Free shipping over 400 DKK
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <h3 className="font-display font-light text-5xl md:text-6xl lg:text-7xl tracking-[-0.03em] leading-[0.98]">
                THE CLEAR
              </h3>
              <p className="mt-6 max-w-[36ch] text-sm md:text-base opacity-70 leading-relaxed">
                Leave-on exfoliant. 120 ml / 4.0 fl oz.
                <br />
                2% BHA + Hyaluronic Acid. Nothing else.
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">Price</p>
              <p className="font-display font-light text-4xl md:text-5xl tracking-[-0.02em] mt-2" data-testid="product-price">
                349 <span className="text-2xl md:text-3xl opacity-60">DKK</span>
              </p>
            </div>
          </div>

          <div className="mt-14 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            {/* Quantity */}
            <div className="inline-flex items-center border border-[#F2EEE8]/25" data-testid="buy-quantity">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                data-testid="buy-qty-decrement"
                className="p-4 hover:bg-white/[0.05] transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" strokeWidth={1.25} />
              </button>
              <span className="w-12 text-center font-mono text-sm tabular-nums" data-testid="buy-qty">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(5, q + 1))}
                data-testid="buy-qty-increment"
                disabled={qty >= 5}
                className="p-4 hover:bg-white/[0.05] transition-colors disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" strokeWidth={1.25} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToBag}
              data-testid="buy-cta"
              className="inline-flex items-center justify-center gap-4 bg-[#F2EEE8] text-[#1F1F1F] px-8 md:px-10 py-5 md:py-6 hover:bg-white transition-colors duration-500 group"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.4} />
              <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Add to bag</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" strokeWidth={1.25} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BuyBlock;
