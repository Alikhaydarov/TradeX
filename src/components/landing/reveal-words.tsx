"use client";

import { useMemo, useRef } from "react";

import { useScrollSignal } from "./scroll-3d";

/**
 * Text that fills in word by word as the block scrolls up the page.
 *
 * Every word is a span whose colour is driven by the shared scroll signal, so
 * a long statement reads as one continuous movement rather than fading in as a
 * single blob. Nothing is hidden: under reduced motion, and before any script
 * runs, the full sentence is already there in its final colour - the effect
 * only ever changes how the words are tinted.
 */
export function RevealWords({
  text,
  className,
  from = "var(--reveal-from)",
  to = "var(--reveal-to)",
  as: Tag = "p",
  spread = 0.55,
}: {
  text: string;
  className?: string;
  from?: string;
  to?: string;
  as?: "p" | "h1" | "h2" | "h3" | "span";
  /** How much of the travel the wave takes to cross the whole block. */
  spread?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const words = useMemo(() => text.split(" "), [text]);

  // Not motion: the words do not move, they change colour. Kept on even when
  // the system asks for reduced motion, or the sentence would just sit there
  // fully lit and the page would lose its one piece of rhythm.
  useScrollSignal(ref, (progress, _leave, node) => {
    const spans = node.querySelectorAll<HTMLElement>("[data-word]");
    const count = spans.length || 1;
    // The wave starts before the block is centred and finishes shortly after,
    // so the last word lands while the sentence is still comfortably in view.
    const head = (progress - 0.15) / spread;
    spans.forEach((span, index) => {
      const at = index / count;
      const lit = Math.min(1, Math.max(0, (head - at) * count * 0.5 + 0.5));
      span.style.color = lit > 0.5 ? to : from;
      span.style.opacity = String(0.55 + lit * 0.45);
    });
  }, { motionSafe: false });

  return (
    <Tag ref={ref as never} className={className}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          data-word
          style={{ color: to, transition: "color .35s ease, opacity .35s ease" }}
        >
          {word}
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}
