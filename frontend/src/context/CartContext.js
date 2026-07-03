import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CartCtx = createContext(null);

const STORAGE_KEY = "nfl.cart.v1";

const DEFAULT_ITEM = {
  product_id: "the-clear-120",
  name: "THE CLEAR",
  subtitle: "Leave-on exfoliant · 120 ml",
  unit_price: 349,
  currency: "DKK",
  quantity: 1,
  image: "/assets/the-clear.png",
};

const readCart = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  // Read from localStorage synchronously on first render — no hydration race.
  const [items, setItems] = useState(readCart);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hydrated = true; // synchronous init means always "hydrated"

  // Persist to localStorage whenever items change
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (_e) { /* quota / disabled */ }
  }, [items]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  const addItem = useCallback(
    (overrides = {}) => {
      setItems((prev) => {
        const merged = { ...DEFAULT_ITEM, ...overrides };
        const existing = prev.find((p) => p.product_id === merged.product_id);
        if (existing) {
          return prev.map((p) =>
            p.product_id === merged.product_id
              ? { ...p, quantity: Math.min(5, p.quantity + (overrides.quantity || 1)) }
              : p
          );
        }
        return [...prev, { ...merged, quantity: Math.min(5, merged.quantity || 1) }];
      });
      setDrawerOpen(true);
    },
    []
  );

  const setQuantity = useCallback((product_id, quantity) => {
    setItems((prev) =>
      prev
        .map((p) => (p.product_id === product_id ? { ...p, quantity: Math.max(0, Math.min(5, quantity)) } : p))
        .filter((p) => p.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((product_id) => {
    setItems((prev) => prev.filter((p) => p.product_id !== product_id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalQuantity = useMemo(
    () => items.reduce((sum, p) => sum + p.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, p) => sum + p.unit_price * p.quantity, 0),
    [items]
  );

  const primaryItem = items[0]; // single-SKU shop — the only item

  const value = useMemo(
    () => ({
      items,
      primaryItem,
      totalQuantity,
      subtotal,
      addItem,
      setQuantity,
      removeItem,
      clear,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      hydrated,
    }),
    [items, primaryItem, totalQuantity, subtotal, addItem, setQuantity, removeItem, clear, drawerOpen, hydrated]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
