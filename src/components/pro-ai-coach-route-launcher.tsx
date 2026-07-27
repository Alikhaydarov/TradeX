"use client";

import { usePathname } from "next/navigation";

import { ProAiCoachLauncher } from "./pro-ai-coach-launcher";

const AI_WORKSPACE_ROUTES = [
  "/dashboard",
  "/calendar",
  "/economic-calendar",
  "/trades",
  "/analytics",
];

export function ProAiCoachRouteLauncher() {
  const pathname = usePathname();
  const visible = AI_WORKSPACE_ROUTES.some((route) => pathname.startsWith(route));

  return visible ? <ProAiCoachLauncher /> : null;
}
