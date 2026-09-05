"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useReducedMotion } from "./scroll-3d";

/** A photographic product reveal that expands into the live dashboard preview. */
export function LaptopScroll({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end end"],
  });

  const laptopScale = useTransform(
    scrollYProgress,
    [0, 0.55],
    reduceMotion ? [1, 1] : [0.92, 1.04],
  );
  const laptopY = useTransform(scrollYProgress, [0, 0.58], [24, -38]);
  const laptopOpacity = useTransform(
    scrollYProgress,
    [0, 0.62, 0.63],
    [1, 1, 0],
  );
  const canvasScale = useTransform(scrollYProgress, [0.64, 0.88], [0.9, 1]);
  const canvasY = useTransform(scrollYProgress, [0.64, 0.88], [54, 0]);
  const canvasOpacity = useTransform(
    scrollYProgress,
    [0.64, 0.65, 1],
    [0, 1, 1],
  );

  return (
    <section
      ref={sectionRef}
      data-laptop-scroll
      // The pull-up used to be 55svh, which lifted the laptop so far that its
      // top edge landed above the hero's sub-copy and secondary CTA: dark
      // product photo behind dark text, with "Sign in" reduced to a ghost.
      // Mobile never had the problem (shorter hero, 42svh), so this is the
      // desktop value coming down to match. The parallax is unchanged - the
      // laptop simply enters from below the hero instead of on top of it.
      className="relative z-0 -mt-[23svh] h-[150svh] max-sm:-mt-[42svh] max-sm:h-[86svh]"
      aria-label="Scroll to open the Tradoxy dashboard preview"
    >
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden max-sm:h-[86svh]">
        <motion.div
          data-laptop-device
          className="relative w-[min(1320px,100vw)] max-sm:hidden"
          style={{ scale: laptopScale, y: laptopY, opacity: laptopOpacity }}
        >
          <Image
            src="/landing/tradoxy-product-laptop.png"
            alt="Tradoxy trading analytics displayed on a premium laptop"
            width={1664}
            height={936}
            priority
            sizes="(max-width: 640px) 160vw, 1320px"
            className="h-auto w-full select-none object-contain"
          />
        </motion.div>

        <div className="relative hidden w-[155vw] shrink-0 translate-y-14 max-sm:block">
          <Image
            src="/landing/tradoxy-product-laptop.png"
            alt="Tradoxy trading analytics displayed on a premium laptop"
            width={1664}
            height={936}
            priority
            sizes="155vw"
            className="h-auto w-full select-none object-contain"
          />
        </div>

        <motion.div
          data-product-canvas
          className="absolute inset-x-5 top-1/2 mx-auto aspect-[16/9] w-[min(1320px,calc(100%-40px))] -translate-y-1/2 overflow-hidden rounded-xl border border-black/15 bg-[#080808] shadow-[0_48px_120px_-54px_rgba(0,0,0,.75)] max-sm:hidden"
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
