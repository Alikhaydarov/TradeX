"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { readPin, useReducedMotion, useScrollSignal } from "./scroll-3d";

/**
 * The hero device, opening as you scroll.
 *
 * A laptop sits tilted away from the reader at the top of the page. As the
 * section scrolls, the lid rotates upright, the base falls away, and the
 * screen scales until it is simply the dashboard, filling the frame.
 *
 * The section is deliberately taller than the viewport and its inner frame is
 * pinned to the top while it passes, so the whole thing plays on the reader's
 * own scroll - the wheel is never captured and the page always scrolls past.
 *
 * Everything is one transform per element, so it composites on the GPU.
 */
export function LaptopScroll({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useScrollSignal(sectionRef, (_progress, _leave, node) => {
    const pin = readPin(node);

    const frame = frameRef.current;
    if (frame) frame.style.transform = `translate3d(0, ${pin.offset}px, 0)`;

    // Finish opening a little before the frame is released, so the dashboard
    // gets a beat at full size before the page moves on.
    const p = 1 - Math.pow(1 - Math.min(1, pin.progress / 0.85), 2.2);

    const screen = screenRef.current;
    if (screen) {
      screen.style.transform = `translateY(${(1 - p) * 4}%) rotateX(${
        (1 - p) * 26
      }deg) scale(${0.82 + p * 0.18})`;
    }

    const base = baseRef.current;
    if (base) {
      // The keyboard half tips down and out of the way as the lid comes up.
      base.style.opacity = String(Math.max(0, 1 - p * 1.9));
      base.style.transform = `rotateX(${68 + p * 22}deg) translateY(${p * 30}px)`;
    }
  });

  // With motion reduced there is nothing to open, so the section collapses to
  // the height of the finished dashboard and simply shows it. Leaving the
  // pinned frame in place would freeze the lid half-way, which is worse than
  // having no effect at all.
  if (reduced) {
    return (
      <section className="mx-auto mt-12 w-[min(1100px,calc(100%-48px))] max-sm:w-[calc(100%-24px)]" aria-hidden="true">
        <div className="overflow-hidden rounded-[18px] border border-black/10 bg-[#0a0a0a] shadow-[0_40px_100px_-60px_rgba(0,0,0,.6)] max-sm:rounded-xl">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative -mt-[20vh] h-[180vh] max-sm:-mt-[10vh] max-sm:h-[150vh]"
      aria-hidden="true"
    >
      <div
        ref={frameRef}
        className="absolute inset-x-0 top-0 flex h-svh items-center justify-center will-change-transform"
      >
        <div
          className="w-[min(1100px,calc(100%-48px))] max-sm:w-[calc(100%-24px)]"
          style={{ perspective: "1600px" }}
        >
          <div style={{ transformStyle: "preserve-3d" }}>
            <div
              ref={screenRef}
              className="origin-bottom overflow-hidden rounded-[18px] border border-black/10 bg-[#0a0a0a] shadow-[0_60px_140px_-70px_rgba(0,0,0,.7)] max-sm:rounded-xl"
              style={{ transform: "rotateX(26deg) scale(.82)" }}
            >
              {children}
            </div>

            <div
              ref={baseRef}
              className="mx-auto h-[26px] w-[86%] origin-top rounded-b-[14px] bg-gradient-to-b from-[#c9c9cc] to-[#8f8f95]"
              style={{ transform: "rotateX(68deg)" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const ROLES = ["companion", "journal", "record", "review"];
const ROLE_MS = 2400;

/**
 * The last word of the headline, cycling through what the product is.
 *
 * It runs on a timer rather than on scroll because it sits above the fold,
 * where there is no scroll to read yet. Under reduced motion it stops on the
 * first word and never moves.
 */
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
      {/* The widest word reserves the space, so the line never reflows. */}
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
