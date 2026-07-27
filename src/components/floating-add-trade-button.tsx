"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { useAuth } from "./auth-context";

const ACCOUNT_WORKSPACE_PATHS = [
  "/dashboard",
  "/calendar",
  "/trades",
  "/analytics",
  "/settings",
];

function isVisibleEnough(element: HTMLElement) {
  return !element.closest("section[aria-hidden='true']");
}

function clickCurrentAddTradeButton() {
  const activeSection =
    document.querySelector("main section:not([aria-hidden='true'])") ||
    document.querySelector("main");
  if (!activeSection) return false;

  const buttons = Array.from(
    activeSection.querySelectorAll("button"),
  ) as HTMLButtonElement[];
  const addTradeButton = buttons.find(
    (button) =>
      /add\s*trade/i.test(button.textContent || "") && isVisibleEnough(button),
  );
  if (!addTradeButton) return false;

  addTradeButton.click();
  return true;
}

export function FloatingAddTradeButton() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const openAddTrade = useCallback(() => {
    if (clickCurrentAddTradeButton()) return;

    if (!ACCOUNT_WORKSPACE_PATHS.some((path) => pathname.startsWith(path))) {
      router.push("/trades");
    }

    window.setTimeout(() => clickCurrentAddTradeButton(), 120);
    window.setTimeout(() => clickCurrentAddTradeButton(), 320);
  }, [pathname, router]);

  useEffect(() => {
    if (!user) return;
    window.addEventListener("tradox:add-trade", openAddTrade);
    return () => window.removeEventListener("tradox:add-trade", openAddTrade);
  }, [openAddTrade, user]);

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
      className="tw-floating-add-trade fixed z-[70] hidden size-[3.45rem] place-items-center rounded-[1rem] border border-emerald-300/20 bg-[#062f16] text-[#35e977] shadow-[0_14px_36px_rgba(0,0,0,.52)] transition hover:scale-[1.03] hover:bg-[#083d1d] active:scale-95 lg:bottom-[1.8rem] lg:right-[1.8rem] lg:grid"
    >
      <Plus size={26} strokeWidth={2.4} />
    </button>
  );
}
