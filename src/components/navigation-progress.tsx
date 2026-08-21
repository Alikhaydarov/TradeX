"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";

interface NavigationState {
  /** Push a route and keep the current screen up until its data has arrived. */
  navigate: (path: string) => void;
  navigating: boolean;
}

const NavigationContext = createContext<NavigationState | null>(null);

/**
 * One navigation indicator for the whole workspace.
 *
 * Each route used to supply its own skeleton through `next/dynamic`, so moving
 * between pages tore the screen down to a grey wireframe and rebuilt it - which
 * reads as slower than it is, and showed a different shape on every route.
 *
 * Routing through `startTransition` instead means React keeps the current page
 * on screen until the next one's data is actually ready, so the only thing that
 * changes during a navigation is this bar. Its lifetime is exactly the request:
 * it appears when the transition starts and leaves when the new route commits.
 */
export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();

  const navigate = useCallback(
    (path: string) => {
      startTransition(() => router.push(path));
    },
    [router],
  );

  return (
    <NavigationContext.Provider value={{ navigate, navigating }}>
      <NavigationProgressBar active={navigating} />
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used inside NavigationProgressProvider");
  }
  return context;
}

/**
 * Creeps toward 90% while the route is in flight, then completes and fades.
 *
 * The progress is deliberately not a real percentage - nothing reports one -
 * but it has to stay honest about the two things the user can verify: it never
 * reaches the end before the page does, and it always finishes once it has.
 */
function NavigationProgressBar({ active }: { active: boolean }) {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setVisible(true);
    setProgress(12);

    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 90 ? current : current + (90 - current) * 0.18));
    }, 180);

    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (active || !visible) return;
    setProgress(100);
    const timer = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [active, visible, pathname]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-busy={active}
      className="pointer-events-none fixed inset-x-0 top-0 z-[2147483646] h-0.5"
    >
      <div
        className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,.55)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
    </div>
  );
}
