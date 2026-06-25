"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, locales, labels, setLocale } = useLanguage();

  return (
    <label className={`flex items-center gap-2 rounded-lg border border-border bg-white/[.025] ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}>
      <Languages size={compact ? 14 : 16} className="text-zinc-500" />
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        className="bg-transparent text-xs font-bold text-zinc-300 outline-none"
        aria-label="Language"
      >
        {locales.map((item) => (
          <option key={item} value={item} className="bg-[#171717] text-zinc-100">
            {labels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
