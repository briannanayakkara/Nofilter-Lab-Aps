import React, { useRef } from "react";
import { motion, useScroll, useTransform, useMotionTemplate, useSpring } from "framer-motion";
import SplitReveal from "./SplitReveal";

const EASE = [0.16, 1, 0.3, 1];

/**
 * Multi-angle bottle. Four transparent PNGs of the same bottle from
 * different rotational positions. We cross-fade between them across the
 * scroll range for an Apple-style rotation illusion.
 */
const ANGLES = [
  "/assets/the-clear.png",           // clean studio front
  "/assets/angles/angle1.png",       // 15° right (lifestyle front tilt)
  "/assets/angles/angle4.png",       // 45° tilt
  "/assets/angles/angle2.png",       // back with the copy
];

const ScrollExperience = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Smoothed progress for buttery motion
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 25, mass: 0.4 });

  // ────────── Background: cream → ink ──────────
  const bgColor = useTransform(p, [0, 0.1, 0.22, 1], ["#F2EEE8", "#F2EEE8", "#1F1F1F", "#1F1F1F"]);
  const textColor = useTransform(p, [0, 0.1, 0.22, 1], ["#1F1F1F", "#1F1F1F", "#F2EEE8", "#F2EEE8"]);

  // ────────── Product transforms ──────────
  const productScale = useTransform(
    p,
    [0, 0.06, 0.2, 0.4, 0.6, 0.85, 0.95],
    [0.78, 0.82, 0.7, 0.62, 0.6, 0.58, 0.42]
  );
  const productX = useTransform(
    p,
    [0, 0.25, 0.42, 0.58, 0.78, 0.95],
    ["0%", "0%", "-22%", "-22%", "24%", "0%"]
  );
  const productY = useTransform(p, [0, 0.5, 1], ["0%", "-2%", "6%"]);
  const productRotate = useTransform(p, [0, 0.2, 0.4, 0.6, 0.85], [-2, 0, 0, 2, 4]);
  const productBlurPx = useTransform(p, [0, 0.55, 0.62, 0.78, 0.85, 0.95], [0, 0, 4, 4, 0, 8]);
  const filter = useMotionTemplate`blur(${productBlurPx}px)`;
  const productOpacity = useTransform(p, [0, 0.9, 1], [1, 1, 0]);

  // ────────── Multi-angle cross-fade (per-image opacity) ──────────
  const angle0Op = useTransform(p, [0.0, 0.14, 0.22], [1, 1, 0]);
  const angle1Op = useTransform(p, [0.14, 0.22, 0.32, 0.4], [0, 1, 1, 0]);
  const angle2Op = useTransform(p, [0.32, 0.42, 0.55, 0.62], [0, 1, 1, 0]);
  const angle3Op = useTransform(p, [0.55, 0.66, 0.86, 0.95], [0, 1, 1, 0]);
  const angleOpacities = [angle0Op, angle1Op, angle2Op, angle3Op];

  // ────────── Text scene opacities ──────────
  const scene1 = useTransform(p, [0, 0.1, 0.18], [1, 1, 0]);
  const scene2 = useTransform(p, [0.18, 0.24, 0.32, 0.4], [0, 1, 1, 0]);
  const scene3a = useTransform(p, [0.38, 0.44, 0.5, 0.55], [0, 1, 1, 0]);
  const scene3b = useTransform(p, [0.48, 0.52, 0.56, 0.62], [0, 1, 1, 0]);
  const sceneIngLabel = useTransform(p, [0.36, 0.42, 0.6, 0.65], [0, 1, 1, 0]);

  const scene4Label = useTransform(p, [0.62, 0.66, 0.86, 0.9], [0, 1, 1, 0]);
  const scene4a = useTransform(p, [0.65, 0.69, 0.86, 0.9], [0, 1, 1, 0]);
  const scene4b = useTransform(p, [0.7, 0.74, 0.86, 0.9], [0, 1, 1, 0]);
  const scene4c = useTransform(p, [0.75, 0.79, 0.86, 0.9], [0, 1, 1, 0]);

  // Results horizontal-scroll simulation: the 3 metric rows translate leftward as scroll continues
  const metricRowX = useTransform(p, [0.65, 0.9], ["4%", "-6%"]);

  // Scroll cue
  const scrollCue = useTransform(p, [0, 0.05], [1, 0]);

  // Fluid morphing gradient
  const gradPos = useTransform(p, [0.3, 0.7], [0, 100]);
  const gradient = useMotionTemplate`radial-gradient(circle at ${gradPos}% 30%, rgba(154,166,178,0.10), transparent 50%), radial-gradient(circle at ${useTransform(gradPos, v => 100 - v)}% 80%, rgba(255,255,255,0.05), transparent 55%)`;

  return (
    <section
      id="the-clear"
      ref={ref}
      data-testid="scroll-experience"
      className="relative"
      style={{ height: "700vh" }}
    >
      <motion.div
        style={{ backgroundColor: bgColor, color: textColor }}
        className="sticky top-0 h-screen w-full overflow-hidden"
      >
        {/* Fluid gradient — visible on dark scenes */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: useTransform(p, [0.22, 0.3, 0.95, 1], [0, 1, 1, 0]),
            background: gradient,
          }}
        />

        {/* Product — multi-angle cross-fade */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            x: productX,
            y: productY,
            scale: productScale,
            rotate: productRotate,
            filter,
            opacity: productOpacity,
          }}
          data-testid="hero-product"
        >
          <div className="relative h-[105vh] aspect-[3/4]">
            {ANGLES.map((src, i) => (
              <motion.img
                key={src}
                src={src}
                alt="The Clear bottle"
                className="absolute inset-0 h-full w-full object-contain select-none"
                style={{
                  opacity: angleOpacities[i],
                  filter:
                    "drop-shadow(0 50px 70px rgba(0,0,0,0.35)) drop-shadow(0 14px 20px rgba(0,0,0,0.18))",
                }}
                draggable={false}
              />
            ))}
          </div>
        </motion.div>

        {/* ================== SCENE 1: Hero tagline (cream) ================== */}
        <motion.div
          style={{ opacity: scene1 }}
          className="absolute inset-0 z-10 flex flex-col px-6 md:px-10 lg:px-16 pt-24 md:pt-28 pointer-events-none"
          data-testid="scene-hero"
        >
          <div className="w-full max-w-[1400px] mx-auto flex justify-between items-start font-mono text-[11px] uppercase tracking-[0.28em] opacity-70">
            <span data-testid="hero-eyebrow">The Clear · 01</span>
            <span className="hidden md:inline">Developed in Denmark</span>
          </div>

          <div className="w-full max-w-[1400px] mx-auto mt-10 md:mt-12">
            <SplitReveal
              as="h1"
              className="font-display font-light text-[16vw] md:text-[11vw] lg:text-[9.5vw] leading-[0.9] tracking-[-0.045em]"
              text="Clear skin."
              delay={0.2}
              testid="hero-title"
            />
            <SplitReveal
              as="div"
              className="font-display font-light text-[16vw] md:text-[11vw] lg:text-[9.5vw] leading-[0.9] tracking-[-0.045em] opacity-55"
              text="Fewer choices."
              delay={0.55}
            />
          </div>

          <div className="mt-auto pb-14 md:pb-16 w-full max-w-[1400px] mx-auto flex items-end justify-between gap-6">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.9 }}
              className="max-w-[32ch] text-sm md:text-base opacity-70 leading-relaxed"
              data-testid="hero-sub"
            >
              A leave-on exfoliant with 2% BHA and Hyaluronic Acid.
              <br className="hidden md:block" />
              Clears pores. Hydrates skin.
            </motion.p>

            <motion.div
              style={{ opacity: scrollCue }}
              className="font-mono text-[10px] uppercase tracking-[0.35em] opacity-60 hidden md:flex flex-col items-center gap-3"
              data-testid="scroll-cue"
            >
              Scroll
              <span className="block h-8 w-px bg-current opacity-40" />
            </motion.div>
          </div>
        </motion.div>

        {/* ================== SCENE 2: Statement ================== */}
        <motion.div
          style={{ opacity: scene2 }}
          className="absolute inset-0 flex items-center justify-center px-6 md:px-10 lg:px-16 pointer-events-none"
          data-testid="scene-statement"
        >
          <div className="max-w-[1400px] mx-auto w-full flex flex-col items-start">
            <p className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.3em] opacity-60 mb-6 md:mb-8">
              A quiet reset
            </p>
            <h2
              className="font-display font-light text-[8vw] md:text-[5.2vw] lg:text-[4.2vw] leading-[1.05] tracking-[-0.03em] max-w-[18ch]"
              data-testid="statement-heading"
            >
              Skincare shouldn’t be
              <br />
              this complicated.
            </h2>
            <p className="mt-8 md:mt-10 max-w-[42ch] text-sm md:text-base leading-relaxed opacity-70" data-testid="statement-body">
              Too many products. Too many steps. Too many things to figure out.
              <br />
              We keep it simple.
            </p>
          </div>
        </motion.div>

        {/* ================== SCENE 3: Ingredients ================== */}
        <div id="ingredients" className="absolute inset-0 hidden md:flex items-center pointer-events-none" data-testid="scene-ingredients">
          <div className="max-w-[1400px] mx-auto w-full grid grid-cols-12 gap-8 px-8 lg:px-16">
            <div className="col-span-6" />
            <div className="col-span-6 space-y-16">
              <motion.p
                style={{ opacity: sceneIngLabel }}
                className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60"
              >
                Two ingredients. Nothing else.
              </motion.p>

              <motion.div style={{ opacity: scene3a }} className="space-y-4" data-testid="ingredient-bha">
                <div className="flex items-baseline gap-6">
                  <span className="font-mono text-xs opacity-50 tabular-nums">01</span>
                  <h3 className="font-display font-light text-4xl lg:text-5xl tracking-[-0.02em]">2% BHA</h3>
                  {/* Water/oil drop micro-icon */}
                  <svg className="ml-2 h-5 w-5 opacity-60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <motion.path
                      d="M12 3 L4 15 a8 8 0 0 0 16 0 Z"
                      stroke="currentColor" strokeWidth="1" fill="rgba(154,166,178,0.15)"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: false, amount: 0.8 }}
                      transition={{ duration: 1.6, ease: EASE }}
                    />
                  </svg>
                </div>
                <p className="font-mono text-xs tracking-widest uppercase opacity-50 pl-12">Salicylic Acid</p>
                <p className="text-sm lg:text-base leading-relaxed max-w-[42ch] opacity-75 pl-12">
                  Dissolves oil and dead skin inside the pore. Fewer breakouts. Smoother texture.
                </p>
              </motion.div>

              <motion.div style={{ opacity: scene3b }} className="space-y-4" data-testid="ingredient-ha">
                <div className="flex items-baseline gap-6">
                  <span className="font-mono text-xs opacity-50 tabular-nums">02</span>
                  <h3 className="font-display font-light text-4xl lg:text-5xl tracking-[-0.02em]">Hyaluronic Acid</h3>
                  <svg className="ml-2 h-5 w-5 opacity-60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <motion.circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1" fill="rgba(154,166,178,0.12)"
                      initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ duration: 1.2, ease: EASE }} viewport={{ once: false, amount: 0.8 }} />
                    <motion.circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.4"
                      initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.2 }} viewport={{ once: false, amount: 0.8 }} />
                  </svg>
                </div>
                <p className="font-mono text-xs tracking-widest uppercase opacity-50 pl-12">Moisture reservoir</p>
                <p className="text-sm lg:text-base leading-relaxed max-w-[42ch] opacity-75 pl-12">
                  Holds water in the skin. Keeps things balanced while the BHA does its work.
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Mobile ingredients */}
        <div className="absolute inset-x-0 bottom-0 md:hidden px-6 pb-24 pointer-events-none" data-testid="scene-ingredients-mobile">
          <motion.div style={{ opacity: scene3a }} className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-2">01 · Salicylic Acid</p>
            <h3 className="font-display font-light text-3xl tracking-[-0.02em]">2% BHA</h3>
          </motion.div>
          <motion.div style={{ opacity: scene3b }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-2">02 · Moisture reservoir</p>
            <h3 className="font-display font-light text-3xl tracking-[-0.02em]">Hyaluronic Acid</h3>
          </motion.div>
        </div>

        {/* ================== SCENE 4: Results with horizontal drift ================== */}
        <div id="results" className="absolute inset-0 flex items-center pointer-events-none" data-testid="scene-results">
          <motion.div
            style={{ x: metricRowX }}
            className="max-w-[1400px] mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 px-6 md:px-10 lg:px-16"
          >
            <div className="md:col-span-7 lg:col-span-6 space-y-10 md:space-y-14">
              <motion.p
                style={{ opacity: scene4Label }}
                className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60"
              >
                Tested on 100+ people · 4 weeks
              </motion.p>

              <div className="space-y-8 md:space-y-10">
                <motion.div style={{ opacity: scene4a }} data-testid="result-1" className="flex items-baseline gap-6 md:gap-10">
                  <span className="font-display font-extralight text-[16vw] md:text-[9vw] lg:text-[7.5vw] leading-none tracking-[-0.05em] tabular-nums" data-testid="metric-1">94%</span>
                  <p className="text-sm md:text-base max-w-[22ch] opacity-70 leading-snug">experienced fewer breakouts</p>
                </motion.div>
                <motion.div style={{ opacity: scene4b }} data-testid="result-2" className="flex items-baseline gap-6 md:gap-10">
                  <span className="font-display font-extralight text-[16vw] md:text-[9vw] lg:text-[7.5vw] leading-none tracking-[-0.05em] tabular-nums" data-testid="metric-2">91%</span>
                  <p className="text-sm md:text-base max-w-[22ch] opacity-70 leading-snug">experienced clearer skin</p>
                </motion.div>
                <motion.div style={{ opacity: scene4c }} data-testid="result-3" className="flex items-baseline gap-6 md:gap-10">
                  <span className="font-display font-extralight text-[16vw] md:text-[9vw] lg:text-[7.5vw] leading-none tracking-[-0.05em] tabular-nums" data-testid="metric-3">88%</span>
                  <p className="text-sm md:text-base max-w-[22ch] opacity-70 leading-snug">experienced improved texture</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default ScrollExperience;
