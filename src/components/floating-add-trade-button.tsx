"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { useAuth } from "./auth-context";

const ACCOUNT_WORKSPACE_PATHS = [
  "/dashboard",
  "/calendar",
  "/trades",
  "/analytics",
  "/settings",
];

function dispatchAddTrade() {
  window.dispatchEvent(new CustomEvent("tradox:add-trade"));
}

export function FloatingAddTradeButton() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const openAddTrade = useCallback(() => {
    const insideTradingWorkspace = ACCOUNT_WORKSPACE_PATHS.some((path) =>
      pathname.startsWith(path),
    );

    if (insideTradingWorkspace) {
      dispatchAddTrade();
      return;
    }

    router.push("/trades");
    window.setTimeout(dispatchAddTrade, 180);
    window.setTimeout(dispatchAddTrade, 420);
  }, [pathname, router]);

  if (!user) return null;

  const hiddenOutsideTrading =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/community");
  if (hiddenOutsideTrading) return null;

  return (
    <button
      type="button"
      aria-label="Add trade"
      onClick={openAddTrade}
      className="fixed z-[70] hidden size-[3.45rem] place-items-center rounded-2xl border border-emerald-300/20 bg-[#062f16] text-[#35e977] shadow-[0_14px_36px_rgba(0,0,0,.52)] transition hover:scale-[1.03] hover:bg-[#083d1d] active:scale-95 lg:bottom-[1.8rem] lg:right-[1.8rem] lg:grid"
    >
      <Plus size={26} strokeWidth={2.4} />
    </button>
  );
}
