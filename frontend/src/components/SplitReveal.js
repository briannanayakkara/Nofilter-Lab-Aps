import React from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

/**
 * Word-level split-reveal — each word rises from below with a stagger.
 * Kept as words (not letters) to feel elegant, not gimmicky.
 */
const SplitReveal = ({ as = "div", text = "", className = "", delay = 0, testid }) => {
  const Tag = motion[as] || motion.div;
  const words = text.split(" ");
  return (
    <Tag
      className={className}
      data-testid={testid}
      aria-label={text}
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.08, delayChildren: delay } },
      }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-baseline pr-[0.22em] last:pr-0">
          <motion.span
            className="inline-block will-change-transform"
            variants={{
              hidden: { y: "110%", opacity: 0 },
              visible: {
                y: "0%",
                opacity: 1,
                transition: { duration: 1.15, ease: EASE },
              },
            }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};

export default SplitReveal;
