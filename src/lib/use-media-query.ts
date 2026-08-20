"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query and re-renders when it flips.
 *
 * Use this instead of rendering both a mobile and a desktop tree and hiding one
 * with `lg:hidden`: CSS hides the markup but React still mounts it, still runs
 * its effects, and still lets any charts inside it lay out and animate. The
 * server snapshot is `false`, which is safe here because the callers are
 * client-only (`ssr: false`) components.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Matches Tailwind's `lg` breakpoint. */
export const LG_BREAKPOINT_QUERY = "(min-width: 1024px)";
