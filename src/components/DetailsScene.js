import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

const callouts = [
  { top: "18%", label: "2% BHA clears pores and exfoliates skin." },
  { top: "34%", label: "Hyaluronic Acid keeps skin hydrated." },
  { top: "52%", label: "No fragrance. No filler. No nonsense." },
  { top: "72%", label: "Leave-on. No rinse. That’s it." },
];

/**
 * Magnified "See the details" scene — pins the back-label bottle and
 * runs a subtle spotlight loupe up the label as the user scrolls, while
 * callouts fade in beside it.
 */
const DetailsScene = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 25, mass: 0.4 });

  // Loupe moves down the label
  const loupeY = useTransform(p, [0.2, 0.85], ["8%", "78%"]);
  // Zoom breathes gently
  const bottleScale = useTransform(p, [0, 0.5, 1], [1.02, 1.12, 1.06]);
  const bottleY = useTransform(p, [0, 1], ["4%", "-4%"]);

  const op0 = useTransform(p, [0.23, 0.28, 0.36, 0.44], [0, 1, 1, 0.35]);
  const op1 = useTransform(p, [0.36, 0.41, 0.49, 0.57], [0, 1, 1, 0.35]);
  const op2 = useTransform(p, [0.49, 0.54, 0.62, 0.7], [0, 1, 1, 0.35]);
  const op3 = useTransform(p, [0.62, 0.67, 0.75, 0.83], [0, 1, 1, 0.35]);
  const opCallouts = [op0, op1, op2, op3];

  return (
    <section
      id="details"
      ref={ref}
      data-testid="section-details"
      className="relative py-32 md:py-48 px-6 md:px-10 lg:px-16 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-8"
        >
          See the details
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1.1, ease: EASE }}
          className="font-display font-light text-4xl md:text-6xl lg:text-7xl leading-[0.98] tracking-[-0.03em] max-w-[22ch]"
        >
          Everything you need,
          <br />
          <span className="opacity-55">written on the bottle.</span>
        </motion.h2>

        <div className="mt-20 md:mt-28 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start">
          {/* Bottle back */}
          <div className="md:col-span-6 relative flex items-center justify-center min-h-[70vh]">
            <motion.div
              style={{ scale: bottleScale, y: bottleY }}
              className="relative"
              data-testid="details-bottle"
            >
              <img
                src="/assets/angles/angle2.png"
                alt="THE CLEAR — back label with instructions"
                className="max-h-[80vh] w-auto object-contain"
                style={{
                  filter:
                    "drop-shadow(0 50px 70px rgba(0,0,0,0.35)) drop-shadow(0 14px 20px rgba(0,0,0,0.16))",
                }}
                draggable={false}
              />
              {/* Loupe / spotlight */}
              <motion.div
                aria-hidden
                data-testid="details-loupe"
                className="absolute left-1/2 -translate-x-1/2 h-32 w-32 md:h-40 md:w-40 rounded-full pointer-events-none"
                style={{
                  top: loupeY,
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(242,238,232,0.14) 0%, rgba(242,238,232,0.06) 40%, transparent 70%)",
                  boxShadow: "inset 0 0 0 1px rgba(242,238,232,0.15)",
                }}
              />
            </motion.div>
          </div>

          {/* Callouts */}
          <div className="md:col-span-6 space-y-10 md:space-y-14 md:pt-10">
            {callouts.map((c, i) => (
              <motion.div
                key={c.label}
                style={{ opacity: opCallouts[i] }}
                className="border-t border-white/15 pt-6"
                data-testid={`detail-callout-${i}`}
              >
                <div className="flex items-baseline gap-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 tabular-nums">
                    · 0{i + 1}
                  </span>
                  <p className="font-display text-2xl md:text-3xl font-light tracking-[-0.02em] leading-snug max-w-[26ch]">
                    {c.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DetailsScene;
