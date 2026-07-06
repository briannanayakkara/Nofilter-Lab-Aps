import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const easeOut = [0.16, 1, 0.3, 1];

const questions = [
  {
    q: "How is this different from other exfoliants?",
    a: "One bottle. Two ingredients that matter — 2% BHA and Hyaluronic Acid. No fillers, no fragrance, no ten-step routine.",
  },
  {
    q: "How often should I use it?",
    a: "Nightly is a good start. Ease in slowly if your skin is new to BHA — two or three times a week for the first weeks.",
  },
  {
    q: "Is it safe for sensitive skin?",
    a: "It’s formulated to be gentle enough for daily use. If your skin runs reactive, patch test on the jawline first.",
  },
  {
    q: "Do I need to rinse it off?",
    a: "No. It’s a leave-on. Apply, let it absorb, move on.",
  },
  {
    q: "Where is it made?",
    a: "Developed and produced in Denmark with dermatologists and biochemists.",
  },
  {
    q: "What comes in the bottle?",
    a: "120 ml / 4.0 fl oz.",
  },
];

const FaqItem = ({ item, index, isOpen, onToggle }) => {
  return (
    <div
      className="border-t border-white/12"
      data-testid={`faq-item-${index}`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        data-testid={`faq-toggle-${index}`}
        className="w-full flex items-baseline justify-between gap-6 py-8 md:py-10 text-left group"
      >
        <span className="font-display font-light text-2xl md:text-3xl lg:text-4xl tracking-[-0.02em] leading-snug transition-opacity duration-500 group-hover:opacity-80">
          {item.q}
        </span>
        <span className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-500 mt-1">
          {isOpen ? (
            <Minus className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.25} />
          ) : (
            <Plus className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.25} />
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="overflow-hidden"
          >
            <p className="pb-10 md:pb-12 pr-6 md:pr-16 text-base md:text-lg opacity-70 leading-relaxed max-w-[60ch]">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Faq = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section
      id="faq"
      data-testid="section-faq"
      className="py-32 md:py-40 lg:py-56 px-6 md:px-10 lg:px-16 border-t border-white/10"
    >
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        <div className="lg:col-span-4">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.9, ease: easeOut }}
            className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-6"
          >
            Frequently asked
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 1.1, ease: easeOut }}
            className="font-display font-light text-5xl md:text-6xl leading-[1] tracking-[-0.03em] sticky top-32"
          >
            Simple <br />
            questions.
          </motion.h2>
        </div>
        <div className="lg:col-span-8">
          {questions.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Faq;
