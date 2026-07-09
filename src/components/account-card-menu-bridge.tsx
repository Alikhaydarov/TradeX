"use client";

import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api-client";

type AccountRow = {
  id: string;
  name: string;
};

const ACTIVE_ACCOUNT_KEY = "tradeway.active-account-id";

function readCardName(card: Element | null) {
  if (!card) return "";
  const candidates = Array.from(card.querySelectorAll("p, strong, h2, h3"));
  const title = candidates
    .map((node) => node.textContent?.trim() || "")
    .find((text) => text && !/^result$/i.test(text) && !/^open dashboard$/i.test(text));
  return title || "";
}

async function findAccountIdByName(name: string) {
  const response = await apiRequest<{ accounts: AccountRow[] }>("/api/prop-accounts");
  const normalized = name.trim().toLowerCase();
  const account = response.accounts.find((item) => item.name.trim().toLowerCase() === normalized)
    || response.accounts.find((item) => item.name.trim().toLowerCase().includes(normalized));
  return account?.id || null;
}

export function AccountCardMenuBridge() {
  const lastCardName = useRef("");

  useEffect(() => {
    const rememberCard = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const actionButton = target?.closest?.('button[aria-label="Actions"]');
      if (!actionButton) return;
      lastCardName.current = readCardName(actionButton.closest(".prop-card-glow"));
    };

    const openSettings = async () => {
      const name = lastCardName.current;
      try {
        const id = name ? await findAccountIdByName(name) : null;
        if (id) window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
      } catch {
        // Settings still opens; selected account fallback is handled by the settings page.
      }
      window.location.assign("/settings");
    };

    const enhanceMenu = (root: ParentNode = document) => {
      const menus = Array.from(root.querySelectorAll('[data-slot="dropdown-menu-content"]'));
      for (const menu of menus) {
        if ((menu as HTMLElement).dataset.accountSettingsReady === "true") continue;
        const destructive = Array.from(menu.querySelectorAll('[role="menuitem"'))
          .find((item) => /delete account/i.test(item.textContent || ""));
        if (!destructive) continue;

        const item = document.createElement("button");
        item.type = "button";
        item.setAttribute("role", "menuitem");
        item.className = "tw-account-settings-item flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-zinc-200 outline-none transition hover:bg-white/[.06] hover:text-white";
        item.innerHTML = '<span aria-hidden="true">⚙</span><span>Settings</span>';
        item.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          void openSettings();
        });

        destructive.parentElement?.insertBefore(item, destructive);
        (menu as HTMLElement).dataset.accountSettingsReady = "true";
      }
    };

    document.addEventListener("pointerdown", rememberCard, true);
    document.addEventListener("click", rememberCard, true);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) enhanceMenu(node);
        });
      }
      enhanceMenu();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    enhanceMenu();

    return () => {
      document.removeEventListener("pointerdown", rememberCard, true);
      document.removeEventListener("click", rememberCard, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
