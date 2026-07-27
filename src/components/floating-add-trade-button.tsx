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
    pathname.startsWith("/community") ||
    pathname.startsWith("/home");
  if (hiddenOutsideTrading) return null;

  return (
    <button
      type="button"
      aria-label="Add trade"
      onClick={openAddTrade}
      className="fixed bottom-7 right-7 z-[70] hidden size-[3.75rem] isolate place-items-center overflow-hidden rounded-2xl border border-emerald-300/40 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.28),transparent_28%),linear-gradient(145deg,#2ee673_0%,#19b956_58%,#109342_100%)] text-[#021309] shadow-[0_18px_50px_rgba(34,197,94,0.26),0_6px_18px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.32)] transition duration-200 before:pointer-events-none before:absolute before:inset-1 before:-z-10 before:rounded-[inherit] before:border before:border-white/12 hover:-translate-y-0.5 hover:scale-[1.035] hover:brightness-110 hover:shadow-[0_22px_58px_rgba(34,197,94,0.34),0_8px_22px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.36)] active:scale-95 lg:grid [&_svg]:size-[1.7rem] [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:rotate-90"
    >
      <Plus strokeWidth={2.4} />
    </button>
  );
}
