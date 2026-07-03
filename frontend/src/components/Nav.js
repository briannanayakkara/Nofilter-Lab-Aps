import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const easeOut = [0.16, 1, 0.3, 1];

const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      // Switch to light logo once background crosses roughly into ink territory.
      // Approximation of when the scroll experience transitions from cream to ink.
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
    { label: "How to use", href: "#how-to-use" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <motion.header
      data-testid="site-nav"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: easeOut, delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-700 ${bgClass}`}
      style={{ color: fg }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-14 h-16 md:h-20 flex items-center justify-between">
        <a
          href="#top"
          data-testid="nav-logo"
          className="flex items-center gap-2 select-none"
          aria-label="Nofilter Lab home"
        >
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

        <nav className="hidden md:flex items-center gap-10">
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
        </nav>

        <a
          href="#the-clear"
          data-testid="nav-cta-shop"
          className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-80 hover:opacity-100 transition-opacity duration-500"
        >
          Shop →
        </a>
      </div>
    </motion.header>
  );
};

export default Nav;
