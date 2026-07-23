"use client";

import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";

function cleanUsername(value: unknown) {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "")
      .replace(/[^a-z0-9_.]/g, "")
      .slice(0, 30) || "trader"
  );
}

export function DashboardGreetingSync() {
  const { user } = useAuth();
  const fallbackUsername = useMemo(
    () =>
      cleanUsername(
        user?.user_metadata.user_name ??
          user?.user_metadata.preferred_username ??
          user?.email?.split("@")[0],
      ),
    [user],
  );
  const [username, setUsername] = useState(fallbackUsername);

  useEffect(() => {
    setUsername(fallbackUsername);
    if (!user) return;

    let active = true;
    void apiRequest<{ profile?: { username?: string | null } }>("/api/profile")
      .then(({ profile }) => {
        if (active && profile?.username) setUsername(cleanUsername(profile.username));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [fallbackUsername, user]);

  useEffect(() => {
    if (!user) return;

    const syncGreeting = () => {
      if (!window.location.pathname.startsWith("/dashboard")) return;

      const main = document.querySelector<HTMLElement>("[data-workspace-main]");
      if (!main) return;

      const heading = Array.from(main.querySelectorAll<HTMLHeadingElement>("h1")).find(
        (item) => item.textContent?.trim().startsWith("Welcome back"),
      );
      if (!heading) return;

      heading.textContent = `Welcome back, ${username}`;
      heading.classList.remove("truncate");

      const container = heading.parentElement;
      if (!container) return;

      const paragraphs = Array.from(container.querySelectorAll<HTMLParagraphElement>(":scope > p"));
      paragraphs.forEach((paragraph) => {
        const text = paragraph.textContent?.trim().toLowerCase() ?? "";
        if (text.includes("/ dashboard") || text.startsWith("ai focus:")) {
          paragraph.hidden = true;
          paragraph.setAttribute("aria-hidden", "true");
        }
      });
    };

    syncGreeting();
    const observer = new MutationObserver(syncGreeting);
    const root = document.querySelector("[data-workspace-main]") ?? document.body;
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("popstate", syncGreeting);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", syncGreeting);
    };
  }, [user, username]);

  return null;
}
