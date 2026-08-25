"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useReducedMotion } from "./scroll-3d";

/** A self-contained product reveal. The device is CSS-built so it stays sharp at every size. */
export function LaptopScroll({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end end"],
  });

  const deviceScale = useTransform(
    scrollYProgress,
    [0, 0.42, 0.72],
    reduceMotion ? [1, 1, 1] : [0.88, 1, 1.06],
  );
  const deviceY = useTransform(scrollYProgress, [0, 0.72], [54, -46]);
  const deviceOpacity = useTransform(
    scrollYProgress,
    [0, 0.6, 0.601],
    [1, 1, 0],
  );
  const canvasScale = useTransform(scrollYProgress, [0.55, 0.82], [0.88, 1]);
  const canvasY = useTransform(scrollYProgress, [0.55, 0.82], [72, 0]);
  const canvasOpacity = useTransform(
    scrollYProgress,
    [0.62, 0.621, 1],
    [0, 1, 1],
  );

  return (
    <section
      ref={sectionRef}
      data-laptop-scroll
      className="relative z-20 -mt-[48svh] h-[164svh] max-sm:-mt-[22svh] max-sm:h-[136svh]"
      aria-label="Scroll to open the Tradoxy dashboard preview"
    >
      <div className="sticky top-[5svh] flex h-[91svh] items-center justify-center overflow-hidden px-4 max-sm:top-[7svh] max-sm:h-[86svh] max-sm:px-2">
        <motion.div
          data-laptop-device
          className="relative w-[min(1120px,94vw)] max-sm:w-[98vw]"
          style={{ scale: deviceScale, y: deviceY, opacity: deviceOpacity }}
        >
          <div className="relative mx-auto w-[86%] rounded-[22px_22px_10px_10px] bg-gradient-to-b from-[#d9d9d9] via-[#8d8d8d] to-[#313131] p-[5px] shadow-[0_40px_90px_-40px_rgba(0,0,0,.7)] max-sm:w-[94%] max-sm:rounded-[12px_12px_6px_6px] max-sm:p-[3px]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[17px_17px_7px_7px] border-[9px] border-[#080808] bg-[#080808] max-sm:rounded-[9px_9px_4px_4px] max-sm:border-[5px]">
              <span className="absolute left-1/2 top-[-6px] z-20 size-[5px] -translate-x-1/2 rounded-full bg-[#242424] ring-1 ring-white/10 max-sm:hidden" />
              <div className="h-full w-full [&>*]:h-full">{children}</div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.035] via-transparent to-transparent" />
            </div>
          </div>

          <div className="relative mx-auto h-[78px] w-full origin-top [perspective:900px] max-sm:h-[44px]">
            <div className="absolute inset-x-0 top-0 h-[72px] [transform:rotateX(62deg)] rounded-[3px_3px_22px_22px] border border-black/15 bg-gradient-to-b from-[#d8d8d8] via-[#a6a6a6] to-[#727272] shadow-[0_26px_42px_-18px_rgba(0,0,0,.55)] max-sm:h-[40px] max-sm:rounded-b-xl">
              <div className="mx-auto mt-2 grid h-[40px] w-[67%] grid-cols-12 gap-[3px] opacity-70 max-sm:mt-1 max-sm:h-[23px] max-sm:gap-px">
                {Array.from({ length: 48 }).map((_, index) => (
                  <span
                    key={index}
                    className="rounded-[2px] bg-[#303030] shadow-inner"
                  />
                ))}
              </div>
              <div className="absolute bottom-1 left-1/2 h-[17px] w-[19%] -translate-x-1/2 rounded border border-black/20 bg-black/[.04] max-sm:h-[9px]" />
            </div>
            <div className="absolute bottom-0 left-1/2 h-[5px] w-[18%] -translate-x-1/2 rounded-b-full bg-gradient-to-b from-[#cfcfcf] to-[#777]" />
          </div>
        </motion.div>

        <motion.div
          data-product-canvas
          className="absolute inset-x-5 top-1/2 mx-auto aspect-[16/9] w-[min(1320px,calc(100%-40px))] -translate-y-1/2 overflow-hidden rounded-xl border border-black/15 bg-[#080808] shadow-[0_48px_120px_-54px_rgba(0,0,0,.75)] max-sm:inset-x-2 max-sm:w-[calc(100%-16px)] max-sm:rounded-lg"
          style={{ scale: canvasScale, y: canvasY, opacity: canvasOpacity }}
        >
          <div className="h-full [&>*]:h-full">{children}</div>
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5" />
        </motion.div>
      </div>
    </section>
  );
}

const ROLES = ["trade", "session", "review", "lesson"];
const ROLE_MS = 2400;

export function RotatingWord({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % ROLES.length),
      ROLE_MS,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className={`relative inline-block align-baseline ${className ?? ""}`}>
      <span className="invisible" aria-hidden="true">
        {ROLES.reduce((a, b) => (b.length > a.length ? b : a))}
      </span>
      <span className="absolute inset-0 flex items-baseline justify-start">
        {ROLES.map((role, at) => (
          <span
            key={role}
            aria-hidden={at !== index}
            className="absolute left-0 whitespace-nowrap transition-all duration-500"
            style={{
              opacity: at === index ? 1 : 0,
              transform: `translateY(${(at - index) * 0.42}em)`,
              filter: at === index ? "none" : "blur(3px)",
            }}
          >
            {role}
          </span>
        ))}
      </span>
    </span>
  );
}
