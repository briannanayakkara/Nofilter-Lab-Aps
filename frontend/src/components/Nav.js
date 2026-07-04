import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { analytics } from "../lib/analytics";

const EASE = [0.16, 1, 0.3, 1];

const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const { totalQuantity, openDrawer, addItem } = useCart();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      const heroHeight = window.innerHeight * 1.2;
      setDarkTheme(y > heroHeight);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isInk = darkTheme;
  const fg = isInk ? "#F2EEE8" : "#1F1F1F";
  const bgClass = scrolled
    ? isInk
      ? "bg-[#1F1F1F]/70 backdrop-blur-xl"
      : "bg-[#F2EEE8]/70 backdrop-blur-xl"
    : "bg-transparent";

  const navItems = [
    { label: "The Clear", href: "#the-clear" },
    { label: "Ingredients", href: "#ingredients" },
    { label: "Results", href: "#results" },
    { label: "Details", href: "#details" },
    { label: "FAQ", href: "#faq" },
  ];

  const handleQuickAdd = () => {
    addItem({ quantity: 1 });
    analytics.addToCart({
      product_id: "the-clear-120",
      quantity: 1,
      subtotal: 349,
      currency: "DKK",
    });
    toast("Added to bag.", { description: "1 × THE CLEAR" });
  };

  return (
    <motion.header
      data-testid="site-nav"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-700 ${bgClass}`}
      style={{ color: fg }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-14 h-16 md:h-20 flex items-center justify-between">
        <a href="#top" data-testid="nav-logo" className="flex items-center gap-2 select-none" aria-label="Nofilter Lab home">
          <AnimatePresence mode="wait">
            <motion.img
              key={isInk ? "light" : "dark"}
              src={isInk ? "/assets/logo-white.svg" : "/assets/logo-black.svg"}
              alt="Nofilter Lab"
              className="h-4 md:h-[18px] w-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          </AnimatePresence>
        </a>

        <AnimatePresence mode="wait">
          {darkTheme ? (
            <motion.div
              key="purchase-bar"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="hidden md:flex items-center gap-6"
              data-testid="nav-purchase-bar"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                THE CLEAR — 349 DKK
              </span>
              <button
                type="button"
                onClick={handleQuickAdd}
                data-testid="nav-buy-cta"
                className="inline-flex items-center gap-2 bg-[#F2EEE8] text-[#1F1F1F] px-5 py-2.5 hover:bg-white transition-colors duration-500"
                aria-label="Add THE CLEAR to bag"
              >
                <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.4} />
                <span className="font-mono text-[11px] uppercase tracking-[0.24em]">Add to bag</span>
              </button>
            </motion.div>
          ) : (
            <motion.nav
              key="nav-links"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="hidden md:flex items-center gap-10"
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-[13px] tracking-wide opacity-70 hover:opacity-100 transition-opacity duration-500"
                >
                  {item.label}
                </a>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {darkTheme && (
              <motion.button
                key="mobile-buy"
                type="button"
                onClick={handleQuickAdd}
                data-testid="nav-buy-cta-mobile"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="md:hidden inline-flex items-center gap-1.5 bg-[#F2EEE8] text-[#1F1F1F] px-3.5 py-2 hover:bg-white transition-colors duration-500"
                aria-label="Add THE CLEAR to bag"
              >
                <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.4} />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Buy</span>
              </motion.button>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={openDrawer}
            data-testid="nav-bag"
            className="relative flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity duration-500"
            aria-label="Open bag"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.4} />
            <span className="font-mono text-[11px] uppercase tracking-[0.24em]">
              Bag
            </span>
            <AnimatePresence>
              {totalQuantity > 0 && (
                <motion.span
                  key="bag-count"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="font-mono text-[10px] tabular-nums leading-none tracking-normal"
                  data-testid="nav-bag-count"
                  style={{ color: fg, opacity: 0.9 }}
                >
                  ({totalQuantity})
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Nav;
