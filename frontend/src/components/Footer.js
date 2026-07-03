import React from "react";
import { motion } from "framer-motion";

const easeOut = [0.16, 1, 0.3, 1];

const Footer = () => {
  return (
    <footer
      data-testid="site-footer"
      className="px-6 md:px-10 lg:px-16 pt-32 md:pt-40 pb-16 border-t border-white/10"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Closing tagline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1.2, ease: easeOut }}
          className="mb-24 md:mb-32 max-w-4xl"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-8">
            The Clear · 120 ml
          </p>
          <h2 className="font-display font-light text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-[-0.03em]">
            Less. <br />
            <span className="opacity-60">Done well.</span>
          </h2>
          <a
            href="#the-clear"
            data-testid="footer-cta"
            className="inline-flex items-center gap-4 mt-14 group"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-80 group-hover:opacity-100 transition-opacity duration-500">
              Shop The Clear
            </span>
            <span className="h-px w-14 bg-current opacity-40 group-hover:w-24 group-hover:opacity-100 transition-all duration-700" />
          </a>
        </motion.div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6 pb-16 border-t border-white/10 pt-16">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 mb-4">
              Nofilter Lab
            </p>
            <img
              src="/assets/logo-white.svg"
              alt="Nofilter Lab"
              className="h-4 w-auto opacity-90"
              data-testid="footer-logo"
            />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 mb-4">
              Origin
            </p>
            <p className="text-sm opacity-70 leading-relaxed">
              Developed and produced in Denmark with dermatologists and
              biochemists.
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 mb-4">
              Contact
            </p>
            <ul className="text-sm opacity-70 space-y-2">
              <li>
                <a
                  data-testid="footer-email"
                  href="mailto:hello@nofilterlab.com"
                  className="hover:opacity-100 opacity-100 transition-opacity"
                >
                  hello@nofilterlab.com
                </a>
              </li>
              <li>Support · Weekdays</li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 mb-4">
              Follow
            </p>
            <ul className="text-sm opacity-70 space-y-2">
              <li>
                <a
                  data-testid="footer-social-instagram"
                  href="#"
                  className="hover:opacity-100 transition-opacity"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  data-testid="footer-social-tiktok"
                  href="#"
                  className="hover:opacity-100 transition-opacity"
                >
                  TikTok
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Fine print */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8 font-mono text-[10px] uppercase tracking-[0.25em] opacity-50">
          <span>© {new Date().getFullYear()} Nofilter Lab</span>
          <span>Made in Denmark</span>
          <div className="flex gap-6">
            <a href="#" data-testid="footer-privacy" className="hover:opacity-100 transition-opacity">
              Privacy
            </a>
            <a href="#" data-testid="footer-terms" className="hover:opacity-100 transition-opacity">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
