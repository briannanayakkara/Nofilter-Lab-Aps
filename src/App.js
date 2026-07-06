import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "./context/CartContext";
import CartDrawer from "./components/CartDrawer";
import Landing from "./pages/Landing";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import { analytics } from "./lib/analytics";
import "./App.css";

const RouteAnalytics = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === "/") analytics.viewHero();
  }, [pathname]);
  return null;
};

function App() {
  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <CartProvider>
          <RouteAnalytics />
          <Toaster
            theme="dark"
            position="bottom-center"
            data-testid="root-toaster"
            toastOptions={{
              style: {
                background: "#1F1F1F",
                color: "#F2EEE8",
                border: "1px solid rgba(242,238,232,0.12)",
                borderRadius: "0",
                fontFamily: "'Manrope', sans-serif",
              },
            }}
          />
          <CartDrawer />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/success" element={<Success />} />
          </Routes>
        </CartProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
