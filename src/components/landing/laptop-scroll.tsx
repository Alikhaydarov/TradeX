"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useReducedMotion } from "./scroll-3d";

/**
 * A scroll-controlled laptop reveal. The lid opens first, then the keyboard
 * falls away while the product grows into the viewport. Motion values update
 * transforms directly, keeping React out of the scroll loop.
 */
export function LaptopScroll({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const screenRotate = useTransform(scrollYProgress, [0, 0.52], [reduceMotion ? 14 : 52, 0]);
  const screenScale = useTransform(scrollYProgress, [0, 0.54, 0.9], [reduceMotion ? 0.9 : 0.74, 0.9, 1]);
  const screenRadius = useTransform(scrollYProgress, [0.45, 0.9], [22, 14]);
  const deckRotate = useTransform(scrollYProgress, [0, 0.58], [reduceMotion ? 78 : 68, 88]);
  const deckY = useTransform(scrollYProgress, [0, 0.58], [0, reduceMotion ? 18 : 42]);
  const deckOpacity = useTransform(scrollYProgress, [0, 0.34, 0.64], [1, 0.8, 0]);
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.55], [0.34, 0]);

  return (
    <section
      ref={sectionRef}
      data-laptop-scroll
      className="relative -mt-16 h-[175svh] max-sm:-mt-8 max-sm:h-[155svh]"
      aria-label="Scroll to open the Tradoxy dashboard preview"
    >
      <div
        data-laptop-stage
        className="sticky top-0 flex h-svh items-center justify-center overflow-hidden"
      >
        <div
          className="w-[min(1120px,calc(100%-36px))] max-sm:w-[calc(100%-18px)]"
          style={{ perspective: "1800px" }}
        >
          <div className="relative" style={{ transformStyle: "preserve-3d" }}>
            <motion.div
              className="relative z-10 origin-bottom overflow-hidden border border-black/15 bg-[#080808] shadow-[0_55px_130px_-60px_rgba(0,0,0,.8)]"
              style={{
                rotateX: screenRotate,
                scale: screenScale,
                borderRadius: screenRadius,
                transformPerspective: 1800,
              }}
            >
              <div className="absolute inset-x-0 top-0 z-20 flex h-5 items-center justify-center bg-black/25 max-sm:h-3">
                <span className="size-1.5 rounded-full bg-white/20 max-sm:size-1" />
              </div>
              {children}
            </motion.div>

            <motion.div
              className="relative z-0 mx-auto h-[76px] w-[82%] origin-top rounded-b-[24px] border border-black/15 bg-[#b9b9bb] shadow-[0_30px_55px_-30px_rgba(0,0,0,.65)] max-sm:h-[42px] max-sm:rounded-b-[14px]"
              style={{
                rotateX: deckRotate,
                y: deckY,
                opacity: deckOpacity,
                transformPerspective: 1800,
              }}
            >
              <div className="mx-auto mt-3 grid w-[72%] grid-cols-12 gap-1 opacity-45 max-sm:mt-2 max-sm:gap-0.5">
                {Array.from({ length: 36 }).map((_, index) => (
                  <span key={index} className="h-1.5 rounded-[2px] bg-black/45 max-sm:h-1" />
                ))}
              </div>
              <span className="absolute bottom-2 left-1/2 h-3 w-[20%] -translate-x-1/2 rounded border border-black/20 max-sm:bottom-1 max-sm:h-2" />
            </motion.div>

            <motion.div
              className="pointer-events-none absolute -bottom-10 left-1/2 h-16 w-[70%] -translate-x-1/2 rounded-[50%] bg-black blur-2xl"
              style={{ opacity: shadowOpacity }}
            />
          </div>
        </div>
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
