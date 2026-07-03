import React, { useRef } from "react";
import { motion, useScroll, useTransform, useMotionTemplate } from "framer-motion";

const easeOut = [0.16, 1, 0.3, 1];

/* Utility: create an opacity curve that ramps up then ramps down over a range */
const fadeRange = (start, holdStart, holdEnd, end) => ({
  input: [start, holdStart, holdEnd, end],
  output: [0, 1, 1, 0],
});

const ScrollExperience = () => {
  const ref = useRef(null);
  // The scroll experience is one tall pinned container ~600vh
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  /* ============================================================
   * BACKGROUND: cream -> ink transition tied to scroll
   * ============================================================ */
  const bgColor = useTransform(
    scrollYProgress,
    [0, 0.1, 0.22, 1],
    ["#F2EEE8", "#F2EEE8", "#1F1F1F", "#1F1F1F"]
  );
  const textColor = useTransform(
    scrollYProgress,
    [0, 0.1, 0.22, 1],
    ["#1F1F1F", "#1F1F1F", "#F2EEE8", "#F2EEE8"]
  );

  /* ============================================================
   * PRODUCT TRANSFORMS
   * The bottle is centered in a sticky frame. We animate scale,
   * position, rotation, blur based on scroll.
   * ============================================================ */
  // Enter smaller so the tagline is visible from the start, then swell/settle
  const productScale = useTransform(
    scrollYProgress,
    [0, 0.06, 0.2, 0.4, 0.6, 0.85, 0.95],
    [0.78, 0.82, 0.7, 0.62, 0.6, 0.58, 0.42]
  );

  // Horizontal: at ingredients scene, ease to left; at results, drift right; then fade out center
  const productX = useTransform(
    scrollYProgress,
    [0, 0.25, 0.42, 0.58, 0.78, 0.95],
    ["0%", "0%", "-22%", "-22%", "24%", "0%"]
  );

  // Vertical parallax — subtle
  const productY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["0%", "-2%", "6%"]
  );

  // Rotation — very subtle to feel cinematic (never bouncy)
  const productRotate = useTransform(
    scrollYProgress,
    [0, 0.2, 0.4, 0.6, 0.85],
    [-2, 0, 0, 2, 4]
  );

  // Blur: focus shifts to data during results
  const productBlur = useTransform(
    scrollYProgress,
    [0, 0.55, 0.62, 0.78, 0.85, 0.95],
    [0, 0, 4, 4, 0, 8]
  );
  const filter = useMotionTemplate`blur(${productBlur}px)`;

  // Opacity: fade out at very end
  const productOpacity = useTransform(
    scrollYProgress,
    [0, 0.9, 1],
    [1, 1, 0]
  );

  /* ============================================================
   * TEXT SCENE OPACITIES
   * ============================================================ */
  // Scene 1 is visible immediately at scroll=0 and fades out as we approach scene 2
  const scene1 = useTransform(scrollYProgress, [0, 0.1, 0.18], [1, 1, 0]);
  const scene2 = useTransform(scrollYProgress, ...Object.values(fadeRange(0.18, 0.24, 0.32, 0.4)));
  // Ingredients (right column) — two staggered blocks
  const scene3a = useTransform(scrollYProgress, ...Object.values(fadeRange(0.38, 0.44, 0.5, 0.55)));
  const scene3b = useTransform(scrollYProgress, ...Object.values(fadeRange(0.48, 0.52, 0.56, 0.62)));
  const sceneIngredientsLabel = useTransform(scrollYProgress, ...Object.values(fadeRange(0.36, 0.42, 0.6, 0.65)));

  // Results scene
  const scene4Label = useTransform(scrollYProgress, ...Object.values(fadeRange(0.62, 0.66, 0.86, 0.9)));
  const scene4a = useTransform(scrollYProgress, ...Object.values(fadeRange(0.65, 0.69, 0.86, 0.9)));
  const scene4b = useTransform(scrollYProgress, ...Object.values(fadeRange(0.7, 0.74, 0.86, 0.9)));
  const scene4c = useTransform(scrollYProgress, ...Object.values(fadeRange(0.75, 0.79, 0.86, 0.9)));

  // Scroll cue
  const scrollCue = useTransform(scrollYProgress, [0, 0.05], [1, 0]);

  return (
    <section
      id="the-clear"
      ref={ref}
      data-testid="scroll-experience"
      className="relative"
      style={{ height: "620vh" }}
    >
      {/* Sticky viewport frame */}
      <motion.div
        style={{ backgroundColor: bgColor, color: textColor }}
        className="sticky top-0 h-screen w-full overflow-hidden"
      >
        {/* Subtle vignette / light-play on dark scenes */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: useTransform(scrollYProgress, [0.22, 0.3, 1], [0, 1, 1]),
            background:
              "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06), transparent 45%), radial-gradient(circle at 80% 80%, rgba(154,166,178,0.05), transparent 55%)",
          }}
        />

        {/* Product Image — pinned & transformed */}
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
          <motion.img
            src="/assets/the-clear.png"
            alt="The Clear — leave-on exfoliant, 120 ml"
            className="h-[105vh] w-auto object-contain select-none"
            style={{
              filter:
                "drop-shadow(0 50px 70px rgba(0,0,0,0.35)) drop-shadow(0 14px 20px rgba(0,0,0,0.16))",
            }}
            draggable={false}
          />
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
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, ease: easeOut, delay: 0.35 }}
              className="font-display font-light text-[16vw] md:text-[11vw] lg:text-[9.5vw] leading-[0.9] tracking-[-0.045em]"
              data-testid="hero-title"
            >
              Clear skin.
              <br />
              <span className="opacity-55">Fewer choices.</span>
            </motion.h1>
          </div>

          <div className="mt-auto pb-14 md:pb-16 w-full max-w-[1400px] mx-auto flex items-end justify-between gap-6">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: easeOut, delay: 0.7 }}
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

        {/* ================== SCENE 2: The statement (ink) ================== */}
        <motion.div
          style={{ opacity: scene2 }}
          className="absolute inset-0 flex items-center justify-center px-6"
          data-testid="scene-statement"
        >
          <div className="max-w-[1400px] mx-auto w-full flex flex-col items-start md:items-start lg:items-start">
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
            <p
              className="mt-8 md:mt-10 max-w-[42ch] text-sm md:text-base leading-relaxed opacity-70"
              data-testid="statement-body"
            >
              Too many products. Too many steps. Too many things to figure out.
              <br />
              We keep it simple.
            </p>
          </div>
        </motion.div>

        {/* ================== SCENE 3: Ingredients (product left, text right) ================== */}
        <div
          id="ingredients"
          className="absolute inset-0 hidden md:flex items-center"
          data-testid="scene-ingredients"
        >
          <div className="max-w-[1400px] mx-auto w-full grid grid-cols-12 gap-8 px-8 lg:px-16">
            <div className="col-span-6" />
            <div className="col-span-6 space-y-16">
              <motion.p
                style={{ opacity: sceneIngredientsLabel }}
                className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60"
              >
                Two ingredients. Nothing else.
              </motion.p>

              <motion.div
                style={{ opacity: scene3a }}
                className="space-y-4"
                data-testid="ingredient-bha"
              >
                <div className="flex items-baseline gap-6">
                  <span className="font-mono text-xs opacity-50 tabular-nums">
                    01
                  </span>
                  <h3 className="font-display font-light text-4xl lg:text-5xl tracking-[-0.02em]">
                    2% BHA
                  </h3>
                </div>
                <p className="font-mono text-xs tracking-widest uppercase opacity-50 pl-12">
                  Salicylic Acid
                </p>
                <p className="text-sm lg:text-base leading-relaxed max-w-[42ch] opacity-75 pl-12">
                  Dissolves oil and dead skin inside the pore. Fewer breakouts.
                  Smoother texture.
                </p>
              </motion.div>

              <motion.div
                style={{ opacity: scene3b }}
                className="space-y-4"
                data-testid="ingredient-ha"
              >
                <div className="flex items-baseline gap-6">
                  <span className="font-mono text-xs opacity-50 tabular-nums">
                    02
                  </span>
                  <h3 className="font-display font-light text-4xl lg:text-5xl tracking-[-0.02em]">
                    Hyaluronic Acid
                  </h3>
                </div>
                <p className="font-mono text-xs tracking-widest uppercase opacity-50 pl-12">
                  Moisture reservoir
                </p>
                <p className="text-sm lg:text-base leading-relaxed max-w-[42ch] opacity-75 pl-12">
                  Holds water in the skin. Keeps things balanced while the BHA
                  does its work.
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Mobile ingredients — stack under the bottle */}
        <div
          className="absolute inset-x-0 bottom-0 md:hidden px-6 pb-24"
          data-testid="scene-ingredients-mobile"
        >
          <motion.div style={{ opacity: scene3a }} className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-2">
              01 · Salicylic Acid
            </p>
            <h3 className="font-display font-light text-3xl tracking-[-0.02em]">
              2% BHA
            </h3>
          </motion.div>
          <motion.div style={{ opacity: scene3b }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-2">
              02 · Moisture reservoir
            </p>
            <h3 className="font-display font-light text-3xl tracking-[-0.02em]">
              Hyaluronic Acid
            </h3>
          </motion.div>
        </div>

        {/* ================== SCENE 4: Results (numbers left, product right) ================== */}
        <div
          id="results"
          className="absolute inset-0 flex items-center"
          data-testid="scene-results"
        >
          <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 px-6 md:px-10 lg:px-16">
            <div className="md:col-span-7 lg:col-span-6 space-y-10 md:space-y-14">
              <motion.p
                style={{ opacity: scene4Label }}
                className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60"
              >
                Tested on 100+ people · 4 weeks
              </motion.p>

              <div className="space-y-8 md:space-y-10">
                <motion.div style={{ opacity: scene4a }} data-testid="result-1" className="flex items-baseline gap-6 md:gap-10">
                  <span
                    className="font-display font-extralight text-[16vw] md:text-[9vw] lg:text-[7.5vw] leading-none tracking-[-0.05em] tabular-nums"
                    data-testid="metric-1"
                  >
                    94%
                  </span>
                  <p className="text-sm md:text-base max-w-[22ch] opacity-70 leading-snug">
                    experienced fewer breakouts
                  </p>
                </motion.div>

                <motion.div style={{ opacity: scene4b }} data-testid="result-2" className="flex items-baseline gap-6 md:gap-10">
                  <span
                    className="font-display font-extralight text-[16vw] md:text-[9vw] lg:text-[7.5vw] leading-none tracking-[-0.05em] tabular-nums"
                    data-testid="metric-2"
                  >
                    91%
                  </span>
                  <p className="text-sm md:text-base max-w-[22ch] opacity-70 leading-snug">
                    experienced clearer skin
                  </p>
                </motion.div>

                <motion.div style={{ opacity: scene4c }} data-testid="result-3" className="flex items-baseline gap-6 md:gap-10">
                  <span
                    className="font-display font-extralight text-[16vw] md:text-[9vw] lg:text-[7.5vw] leading-none tracking-[-0.05em] tabular-nums"
                    data-testid="metric-3"
                  >
                    88%
                  </span>
                  <p className="text-sm md:text-base max-w-[22ch] opacity-70 leading-snug">
                    experienced improved texture
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default ScrollExperience;
