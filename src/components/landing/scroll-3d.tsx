"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * One controller for every scroll-driven element on the page.
 *
 * Each <Scroll3D> registers itself here instead of owning a scroll listener.
 * The controller keeps a single IntersectionObserver and a single
 * requestAnimationFrame loop, and the loop only runs while something is
 * actually on screen - scroll past the landing page and it stops completely.
 *
 * Only `transform` and `opacity` are written, so the browser composites the
 * whole effect off the main thread and never re-lays-out the document.
 */

type Entry = {
  element: HTMLElement;
  /**
   * `progress` is arrival: 0 just below the fold, 1 once read.
   * `leave` is departure: 0 until the element's top passes the viewport top,
   * then 1 by the time it has scrolled its own height away.
   */
  apply: (progress: number, leave: number, element: HTMLElement) => void;
};

type Controller = {
  observer: IntersectionObserver;
  visible: Set<Entry>;
  entries: Map<HTMLElement, Entry>;
  frame: number;
};

let controller: Controller | null = null;

function readProgress(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  const viewport = window.innerHeight || 1;
  // 0 when the element's top edge is still one viewport below the fold,
  // 1 once it has travelled to the comfortable reading position.
  const travelled = viewport - box.top;
  const distance = viewport * 0.75 + box.height * 0.25;
  return Math.min(1, Math.max(0, travelled / distance));
}

function readLeave(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  return Math.min(1, Math.max(0, -box.top / Math.max(1, box.height)));
}

function getController(): Controller {
  if (controller) return controller;

  const created: Controller = {
    visible: new Set(),
    entries: new Map(),
    frame: 0,
    observer: new IntersectionObserver(
      (records) => {
        records.forEach((record) => {
          const entry = created.entries.get(record.target as HTMLElement);
          if (!entry) return;
          if (record.isIntersecting) created.visible.add(entry);
          else {
            created.visible.delete(entry);
            // Settle anything that left the screen so it is correct when it
            // scrolls back into view.
            const above = record.boundingClientRect.top < 0;
            entry.apply(above ? 1 : 0, above ? 1 : 0, entry.element);
          }
        });
        schedule(created);
      },
      { rootMargin: "12% 0px 12% 0px", threshold: 0 },
    ),
  };

  window.addEventListener("scroll", () => schedule(created), { passive: true });
  window.addEventListener("resize", () => schedule(created), { passive: true });
  controller = created;
  return created;
}

function schedule(active: Controller) {
  if (active.frame || active.visible.size === 0) return;
  active.frame = window.requestAnimationFrame(() => {
    active.frame = 0;
    active.visible.forEach((entry) => {
      entry.apply(readProgress(entry.element), readLeave(entry.element), entry.element);
    });
  });
}

function register(entry: Entry) {
  const active = getController();
  active.entries.set(entry.element, entry);
  active.observer.observe(entry.element);
  entry.apply(readProgress(entry.element), readLeave(entry.element), entry.element);
  return () => {
    active.observer.unobserve(entry.element);
    active.entries.delete(entry.element);
    active.visible.delete(entry);
  };
}

const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);

export type Scroll3DProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** How far back in Z the element starts, in pixels. */
  depth?: number;
  /** Starting rotation around X, in degrees. Negative tips the top away. */
  rotate?: number;
  /** Starting vertical offset, in pixels. */
  lift?: number;
  /** Delay this element behind its neighbours, 0-1 of the travel. */
  delay?: number;
  /** Keep reacting to scroll after arrival instead of settling. */
  sustain?: boolean;
  /**
   * When false the element is fully visible from the first paint and only
   * animates as it leaves. Use it above the fold, where an entrance animation
   * would mean holding back the first thing a visitor is meant to see.
   */
  enter?: boolean;
  as?: "div" | "section" | "article" | "li";
};

/**
 * Wraps its children in a element that rises out of depth as it scrolls in.
 *
 * With `sustain`, the element keeps tracking the scroll position after it has
 * arrived, so it drifts gently while you read - that is what makes a long page
 * feel three-dimensional rather than merely animated on entry.
 */
export function Scroll3D({
  children,
  className,
  style,
  depth = 160,
  rotate = 9,
  lift = 48,
  delay = 0,
  sustain = false,
  enter = true,
  as = "div",
}: Scroll3DProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.style.opacity = "1";
      element.style.transform = "none";
      return;
    }

    return register({
      element,
      apply: (raw, leave, node) => {
        if (!enter) {
          node.style.opacity = String(1 - leave * 0.65);
          node.style.transform = `translate3d(0, ${leave * -lift}px, ${
            leave * -depth
          }px) rotateX(${leave * -rotate}deg)`;
          return;
        }
        const shifted = Math.min(1, Math.max(0, (raw - delay) / (1 - delay)));
        const eased = easeOut(shifted);
        const rest = 1 - eased;
        const drift = sustain ? (raw - 0.5) * 14 : 0;
        node.style.opacity = String(Math.min(1, 0.15 + eased * 1.15));
        node.style.transform = `translate3d(0, ${rest * lift + drift}px, ${
          rest * -depth
        }px) rotateX(${rest * rotate}deg)`;
      },
    });
  }, [delay, depth, enter, lift, rotate, sustain]);

  const Tag = as;
  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        opacity: enter ? 0 : 1,
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

/** Gives a subtree the perspective every Scroll3D inside it renders against. */
export function Scroll3DStage({
  children,
  className,
  perspective = 1400,
}: {
  children: ReactNode;
  className?: string;
  perspective?: number;
}) {
  return (
    <div className={className} style={{ perspective: `${perspective}px` }}>
      {children}
    </div>
  );
}
