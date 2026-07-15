"use client";

import type { Section } from "./types";

const reservedPaths = new Set([
  "",
  "accounts",
  "dashboard",
  "calendar",
  "trades",
  "analytics",
  "settings",
  "profile",
  "account",
  "pricing",
  "admin",
  "superadmin",
]);

const sectionPaths: Record<Section, string> = {
  feed: "/",
  accounts: "/accounts",
  dashboard: "/dashboard",
  calendar: "/calendar",
  trades: "/trades",
  analytics: "/analytics",
  settings: "/settings",
  account: "/profile",
  pricing: "/pricing",
  admin: "/superadmin",
};

export const cachedSections: Section[] = [
  "feed",
  "accounts",
  "dashboard",
  "calendar",
  "trades",
  "analytics",
  "settings",
  "account",
  "pricing",
  "admin",
];

export const workspaceSections: Section[] = [
  "accounts",
  "dashboard",
  "calendar",
  "trades",
  "analytics",
  "settings",
];

export function usernameFromPath(pathname: string) {
  const first = pathname.replace(/^\//, "").split("/")[0] ?? "";
  if (reservedPaths.has(first)) return "";
  return first.toLowerCase();
}

export function sectionFromPath(pathname: string): Section {
  if (pathname.startsWith("/accounts")) return "accounts";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/trades")) return "trades";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/profile") || pathname.startsWith("/account") || usernameFromPath(pathname)) return "account";
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/admin")) return "admin";
  return "feed";
}

export function pathFromSection(section: Section) {
  return sectionPaths[section];
}

export function getCurrentSection() {
  if (typeof window === "undefined") return "feed" as Section;
  return sectionFromPath(window.location.pathname);
}

export function getCurrentProfileUsername() {
  if (typeof window === "undefined") return "";
  return usernameFromPath(window.location.pathname);
}
