"use client";

import type { ReactNode } from "react";

import { useAuth } from "../auth-context";
import { WORKSPACE_TAILWIND_CLASS } from "./app-tailwind-classes";

const WORKSPACE_STRUCTURE_CLASS = [
  "!contents",
  "[&>.workspace-shell]:flex [&>.workspace-shell]:h-dvh [&>.workspace-shell]:w-full [&>.workspace-shell]:overflow-clip [&>.workspace-shell]:bg-black [&>.workspace-shell]:p-0 [&>.workspace-shell]:text-foreground lg:[&>.workspace-shell]:gap-0",
  "[&>.workspace-shell>[data-workspace-main]]:h-dvh [&>.workspace-shell>[data-workspace-main]]:min-w-0 [&>.workspace-shell>[data-workspace-main]]:flex-1 [&>.workspace-shell>[data-workspace-main]]:overflow-x-hidden [&>.workspace-shell>[data-workspace-main]]:overflow-y-auto [&>.workspace-shell>[data-workspace-main]]:overscroll-contain [&>.workspace-shell>[data-workspace-main]]:rounded-none [&>.workspace-shell>[data-workspace-main]]:border-0 [&>.workspace-shell>[data-workspace-main]]:bg-black",
  "lg:[&>.workspace-shell>aside]:top-0 lg:[&>.workspace-shell>aside]:left-0 lg:[&>.workspace-shell>aside]:h-dvh lg:[&>.workspace-shell>aside]:rounded-none lg:[&>.workspace-shell>aside]:border-0 lg:[&>.workspace-shell>aside]:shadow-none",
  "lg:[&>.workspace-shell>aside:not([data-community-sidebar])]:!w-[252px] lg:[&>.workspace-shell>aside:not([data-community-sidebar])]:!p-[.85rem] lg:[&>.workspace-shell>aside:not([data-community-sidebar])]:!border-r lg:[&>.workspace-shell>aside:not([data-community-sidebar])]:!border-r-white/[.1]",
  "lg:[&>.workspace-shell>aside:not([data-community-sidebar])]:!bg-black",
  "lg:[&>.workspace-shell>aside:not([data-community-sidebar])+div[aria-hidden='true']]:!w-[252px]",
  "lg:[&>.workspace-shell>aside[data-community-sidebar]]:!p-0 lg:[&>.workspace-shell>aside[data-community-sidebar]]:!border-r lg:[&>.workspace-shell>aside[data-community-sidebar]]:!border-r-white/[.075]",
  "lg:[&>.workspace-shell>aside[data-community-sidebar='collapsed']]:!w-[76px] lg:[&>.workspace-shell>aside[data-community-sidebar='expanded']]:!w-[236px]",
  "lg:[&>.workspace-shell>aside[data-community-sidebar='collapsed']+div[aria-hidden='true']]:!w-[76px] lg:[&>.workspace-shell>aside[data-community-sidebar='expanded']+div[aria-hidden='true']]:!w-[236px]",
  "[&>.workspace-shell>aside[data-community-sidebar]+div[aria-hidden='true']]:transition-[width] [&>.workspace-shell>aside[data-community-sidebar]+div[aria-hidden='true']]:duration-200 [&>.workspace-shell>aside[data-community-sidebar]+div[aria-hidden='true']]:ease-out",
].join(" ");

export function WorkspaceTailwindBoundary({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!user) return <>{children}</>;

  return (
    <div className={`${WORKSPACE_TAILWIND_CLASS} ${WORKSPACE_STRUCTURE_CLASS}`}>
      {children}
    </div>
  );
}
