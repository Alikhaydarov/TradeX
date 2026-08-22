"use client";

import { useRef } from "react";

import { useScrollSignal } from "./scroll-3d";

/**
 * A figure that counts up to its real value as it scrolls into view.
 *
 * The value it lands on is the truth; the count is only how it arrives, and it
 * is driven by scroll position rather than a timer, so scrolling back up
 * rewinds it instead of replaying an animation the reader did not ask for.
 */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  // A changing number is not movement, so this runs regardless of the reduced
  // motion setting; it only ever ends on the real figure.
  useScrollSignal(
    ref,
    (progress, _leave, node) => {
      const eased = 1 - Math.pow(1 - Math.min(1, progress / 0.75), 3);
      node.textContent = `${prefix}${(value * eased).toFixed(decimals)}${suffix}`;
    },
    { motionSafe: false },
  );

  return (
    <span ref={ref} className={className}>
      {`${prefix}${value.toFixed(decimals)}${suffix}`}
    </span>
  );
}
