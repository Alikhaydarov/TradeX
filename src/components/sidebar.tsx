"use client";

import type { User } from "@supabase/supabase-js";

import type { Section } from "./types";
import { SidebarView } from "./sidebar/sidebar-view";
import { useSidebarController } from "./sidebar/use-sidebar-controller";

export function Sidebar({
  active,
  onChange,
  onLogin,
  user,
  hideMobile = false,
}: {
  active: Section;
  onChange: (section: Section) => void;
  onLogin: () => void;
  user: User | null;
  hideMobile?: boolean;
}) {
  const controller = useSidebarController({ active, onChange, onLogin, user });
  return <SidebarView controller={controller} hideMobile={hideMobile} />;
}
