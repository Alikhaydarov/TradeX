"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "./app-shell";
import { useAuth } from "./auth-context";

/**
 * Temporary compatibility bridge while routes are migrated from the legacy
 * SPA shell to real App Router pages. Migrated routes render through
 * `children`; all remaining routes continue to use AppShell until their page
 * components are ready.
 */
export function AppRouterMigrationGate() {
  const pathname = usePathname();
  const { user } = useAuth();

  const landingHandledByAppRouter = pathname === "/" && !user;

  if (landingHandledByAppRouter) return null;

  return <AppShell />;
}
