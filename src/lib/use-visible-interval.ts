"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `callback` on an interval, but only while the tab is actually visible.
 *
 * Background tabs used to keep every poller alive, which burned Supabase reads
 * and serverless invocations for a screen nobody was looking at, and produced a
 * burst of overlapping work the moment the user came back. This pauses on
 * `visibilitychange` and fires once immediately on return so the view is fresh
 * without waiting out a full period.
 *
 * Pass `intervalMs = 0` to disable polling entirely.
 */
export function useVisibleInterval(
  callback: () => void,
  intervalMs: number,
  { runOnFocus = true }: { runOnFocus?: boolean } = {},
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (intervalMs <= 0) return;

    let timer: number | null = null;

    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      stop();
      timer = window.setInterval(() => savedCallback.current(), intervalMs);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
        return;
      }
      if (runOnFocus) savedCallback.current();
      start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs, runOnFocus]);
}
