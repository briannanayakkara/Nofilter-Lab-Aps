import React from "react";
import { motion } from "framer-motion";

const easeOut = [0.16, 1, 0.3, 1];

const steps = [
  {
    n: "01",
    title: "Cleanse",
    body: "Start with clean, dry skin.",
  },
  {
    n: "02",
    title: "Apply",
    body: "7–12 drops across the face. Avoid the eye area.",
  },
  {
    n: "03",
    title: "Let it work",
    body: "Leave-on. Don’t rinse. Move on with your day.",
  },
];

const HowToUse = () => {
  return (
    <section
      id="how-to-use"
      data-testid="section-how-to-use"
      className="py-32 md:py-40 lg:py-56 px-6 md:px-10 lg:px-16"
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-20 md:mb-28 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 1, ease: easeOut }}
            className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-8"
          >
            How to use
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 1.1, ease: easeOut, delay: 0.05 }}
            className="font-display font-light text-4xl md:text-6xl lg:text-7xl leading-[1.02] tracking-[-0.03em]"
          >
            Three steps. That’s it.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-14 md:gap-10 lg:gap-16">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              data-testid={`how-step-${i + 1}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 1, ease: easeOut, delay: 0.1 * i }}
              className="border-t border-white/15 pt-8"
            >
              <div className="flex items-baseline justify-between mb-10 md:mb-14">
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">
                  Step {s.n}
                </span>
                <span className="font-display text-xl opacity-40">·</span>
              </div>
              <h3 className="font-display font-light text-3xl md:text-4xl tracking-[-0.02em] mb-5">
                {s.title}
              </h3>
              <p className="text-sm md:text-base leading-relaxed opacity-70 max-w-[30ch]">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowToUse;
