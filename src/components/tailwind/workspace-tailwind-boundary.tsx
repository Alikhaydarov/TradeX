"use client";

import type { ReactNode } from "react";

/**
 * Compatibility boundary kept so existing layouts do not need to change.
 * Workspace-specific Tailwind overrides now live on the real workspace shell,
 * where direct-child selectors can target Sidebar and data-workspace-main
 * without brittle nested wrapper selectors.
 */
export function WorkspaceTailwindBoundary({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
