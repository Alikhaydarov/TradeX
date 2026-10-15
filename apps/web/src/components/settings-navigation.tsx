"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, SlidersHorizontal, UserRound } from "lucide-react";

const sections = [
  ["Profile", "/settings/profile", UserRound],
  ["Display", "/settings/display", SlidersHorizontal],
] as const;

export function SettingsNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Settings sections"
      className="flex gap-2 border-b border-neutral-800 pb-4 md:block md:space-y-1 md:border-r md:border-b-0 md:pr-5 md:pb-0"
    >
      {sections.map(([label, href, Icon]) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center gap-2 rounded-md px-3 text-sm md:w-full ${active ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-950 hover:text-white"}`}
          >
            <Icon size={17} />
            <span>{label}</span>
            <ChevronRight size={15} className="ml-auto hidden md:block" />
          </Link>
        );
      })}
    </nav>
  );
}
