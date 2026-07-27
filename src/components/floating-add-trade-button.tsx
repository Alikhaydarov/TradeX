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

const BUTTON_CLASS = [
  "tw-floating-add-trade fixed bottom-5 right-5 z-[70] hidden size-[3.75rem] place-items-center overflow-hidden rounded-full",
  "isolate [-webkit-tap-highlight-color:transparent]",
  "border border-[rgba(134,239,172,0.42)]",
  "bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.28),transparent_28%),linear-gradient(145deg,#2ee673_0%,#19b956_58%,#109342_100%)]",
  "text-[#021309] shadow-[0_18px_50px_rgba(34,197,94,0.26),0_6px_18px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.32)]",
  "[transition:transform_180ms_ease,filter_180ms_ease,box-shadow_180ms_ease]",
  "before:pointer-events-none before:absolute before:inset-1 before:-z-10 before:rounded-[inherit] before:border before:border-white/[0.12] before:content-['']",
  "hover:-translate-y-0.5 hover:scale-[1.035] hover:brightness-[1.08] hover:shadow-[0_22px_58px_rgba(34,197,94,0.34),0_8px_22px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.36)]",
  "active:scale-[0.94]",
  "[&_svg]:size-[1.7rem] [&_svg]:transition-transform [&_svg]:duration-[180ms] hover:[&_svg]:rotate-90",
  "lg:bottom-7 lg:right-7 lg:grid",
].join(" ");

function isVisibleEnough(element: HTMLElement) {
  const section = element.closest("section[aria-hidden='true']");
  if (section) return false;
  return true;
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

    window.setTimeout(() => clickCurrentAddTradeButton(), 90);
    window.setTimeout(() => clickCurrentAddTradeButton(), 260);
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
      className={BUTTON_CLASS}
    >
      <Plus size={26} strokeWidth={2.4} />
    </button>
  );
}
