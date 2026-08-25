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
  const screenScale = useTransform(scrollYProgress, [0, 0.54, 0.9], [reduceMotion ? 0.96 : 0.9, 0.97, 1]);
  const screenRadius = useTransform(scrollYProgress, [0.45, 0.9], [22, 14]);
  const screenOpacity = useTransform(scrollYProgress, [0, 0.82, 1], [1, 1, 0]);
  const deckRotate = useTransform(scrollYProgress, [0, 0.58], [reduceMotion ? 64 : 56, 86]);
  const deckY = useTransform(scrollYProgress, [0, 0.58], [-2, reduceMotion ? 18 : 48]);
  const deckOpacity = useTransform(scrollYProgress, [0, 0.34, 0.64, 1], [1, 0.8, 0, 0]);
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.55, 1], [0.34, 0, 0]);

  return (
    <section
      ref={sectionRef}
      data-laptop-scroll
      className="relative z-20 -mt-[58svh] h-[174svh] max-sm:-mt-[24svh] max-sm:h-[136svh]"
      aria-label="Scroll to open the Tradoxy dashboard preview"
    >
      <div
        data-laptop-stage
        className="sticky top-[10svh] flex h-[82svh] items-end justify-center overflow-hidden pb-[2svh] max-sm:top-[8svh] max-sm:h-[84svh] max-sm:pb-[6svh]"
      >
        <div
          className="w-[min(1480px,calc(100%-48px))] max-sm:w-[calc(100%-18px)]"
          style={{ perspective: "1800px" }}
        >
          <div className="relative" style={{ transformStyle: "preserve-3d" }}>
            <motion.div
              className="relative z-10 origin-bottom overflow-hidden border border-black/15 bg-[#080808] shadow-[0_55px_130px_-60px_rgba(0,0,0,.8)]"
              style={{
                rotateX: screenRotate,
                scale: screenScale,
                opacity: screenOpacity,
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
              data-laptop-deck
              className="relative z-0 mx-auto h-[150px] w-[92%] origin-top overflow-visible rounded-b-[24px] border border-black/15 bg-[linear-gradient(155deg,#e2e2e3_0%,#aaa9ac_48%,#d7d7d9_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,.95),inset_0_-10px_22px_rgba(0,0,0,.1),0_42px_70px_-34px_rgba(0,0,0,.72)] max-sm:h-[90px] max-sm:w-[96%] max-sm:rounded-b-[15px]"
              style={{
                rotateX: deckRotate,
                y: deckY,
                opacity: deckOpacity,
                transformPerspective: 1800,
              }}
            >
              <div className="absolute -top-2 left-[11%] h-3 w-[16%] rounded-full bg-[linear-gradient(180deg,#555,#111_55%,#777)] shadow-[0_1px_2px_rgba(0,0,0,.7)] max-sm:-top-1 max-sm:h-1.5" />
              <div className="absolute -top-2 right-[11%] h-3 w-[16%] rounded-full bg-[linear-gradient(180deg,#555,#111_55%,#777)] shadow-[0_1px_2px_rgba(0,0,0,.7)] max-sm:-top-1 max-sm:h-1.5" />

              <div className="mx-auto mt-4 flex w-[89%] items-start justify-center gap-[2.2%] max-sm:mt-2">
                <div className="mt-1 h-[78px] w-[8%] rounded-md bg-[radial-gradient(circle,rgba(45,45,47,.7)_1px,transparent_1.5px)] opacity-55 [background-size:6px_6px] max-sm:h-[43px] max-sm:[background-size:3px_3px]" />
                <div className="grid w-[72%] grid-cols-12 gap-1 rounded-md border border-black/10 bg-black/10 p-1.5 shadow-[inset_0_1px_4px_rgba(0,0,0,.22)] max-sm:gap-[2px] max-sm:p-[3px]">
                  {Array.from({ length: 60 }).map((_, index) => (
                    <span
                      key={index}
                      className="h-3 rounded-[2px] border border-white/10 bg-[linear-gradient(180deg,#38383a,#171718)] shadow-[0_1px_1px_rgba(0,0,0,.45)] max-sm:h-1.5 max-sm:rounded-[1px]"
                    />
                  ))}
                </div>
                <div className="mt-1 h-[78px] w-[8%] rounded-md bg-[radial-gradient(circle,rgba(45,45,47,.7)_1px,transparent_1.5px)] opacity-55 [background-size:6px_6px] max-sm:h-[43px] max-sm:[background-size:3px_3px]" />
              </div>

              <span className="absolute bottom-3.5 left-1/2 h-[40px] w-[34%] -translate-x-1/2 rounded-md border border-black/20 bg-white/5 shadow-[inset_0_1px_2px_rgba(255,255,255,.42)] max-sm:bottom-2 max-sm:h-[23px] max-sm:rounded" />
              <span className="absolute inset-x-[1.5%] -bottom-3 h-4 origin-top rounded-b-[20px] border-x border-b border-black/25 bg-[linear-gradient(180deg,#aaa,#747477)] shadow-[0_8px_10px_-6px_rgba(0,0,0,.7)] max-sm:-bottom-1.5 max-sm:h-2 max-sm:rounded-b-[10px]" />
              <span className="absolute -bottom-3 left-1/2 z-10 h-1.5 w-[13%] -translate-x-1/2 rounded-b-full bg-[#d9d9db] shadow-[inset_0_-1px_1px_rgba(0,0,0,.35)] max-sm:-bottom-1.5 max-sm:h-1" />
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
