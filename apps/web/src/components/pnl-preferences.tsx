"use client";

import { Check, EyeOff, Percent, Wallet } from "lucide-react";
import { createContext, useContext, useRef, useState } from "react";

export type PnlMode = "money" | "percentage" | "hidden";
const PnlContext = createContext({ mode: "money" as PnlMode, balance: 0 });
const options = [
  { value: "money", label: "Money View", icon: Wallet },
  { value: "percentage", label: "Percentage View", icon: Percent },
  { value: "hidden", label: "Hide P&L", icon: EyeOff },
] as const;

export function PnlPreferences({
  children,
  balance,
  initialMode = "money",
}: {
  children: React.ReactNode;
  balance: number;
  initialMode?: PnlMode;
}) {
  const [mode, setMode] = useState<PnlMode>(initialMode);
  function changeMode(nextMode: PnlMode) {
    setMode(nextMode);
    document.cookie = `tradoxy_pnl=${nextMode}; Path=/; Max-Age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem("tradoxy:pnl-mode", nextMode);
    } catch {
      /* Cookie remains the source of truth. */
    }
  }
  return (
    <PnlContext.Provider value={{ mode, balance }}>
      <PnlSetter.Provider value={changeMode}>
        <div data-pnl-mode={mode}>{children}</div>
      </PnlSetter.Provider>
    </PnlContext.Provider>
  );
}
const PnlSetter = createContext<(mode: PnlMode) => void>(() => {});

export function PnlDisplaySettings() {
  const { mode } = useContext(PnlContext);
  const setMode = useContext(PnlSetter);
  return (
    <fieldset className="mt-6 max-w-xl">
      <legend className="mb-3 text-sm font-medium">Profit &amp; loss</legend>
      <div className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-14 cursor-pointer items-center gap-3 px-4 text-sm hover:bg-neutral-950"
          >
            <option.icon size={17} className="text-neutral-400" />
            <span className="flex-1">{option.label}</span>
            <input
              className="size-4 accent-white"
              type="radio"
              name="pnl-mode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => setMode(option.value)}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PnlModeMenu() {
  const { mode } = useContext(PnlContext);
  const setMode = useContext(PnlSetter);
  const menu = useRef<HTMLDetailsElement>(null);
  const active = options.find((option) => option.value === mode)!;
  const Icon = active.icon;
  return (
    <details
      ref={menu}
      className="pnl-mode-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) menu.current.open = false;
      }}
    >
      <summary aria-label={`P&L display: ${active.label}`} title={active.label}>
        <Icon size={17} />
      </summary>
      <div aria-label="P&L display mode">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            aria-pressed={mode === option.value}
            onClick={() => {
              setMode(option.value);
              if (menu.current) menu.current.open = false;
            }}
          >
            <option.icon size={15} />
            <span>{option.label}</span>
            {mode === option.value && <Check size={14} />}
          </button>
        ))}
      </div>
    </details>
  );
}

export function Money({
  value,
  basis,
  balance = false,
  compact = false,
}: {
  value: number;
  basis?: number;
  balance?: boolean;
  compact?: boolean;
}) {
  const context = useContext(PnlContext);
  const denominator = basis ?? context.balance;
  if (context.mode === "hidden")
    return (
      <span className="financial-value" aria-label="Amount hidden">
        ••••••
      </span>
    );
  if (context.mode === "percentage" && !balance)
    return (
      <span className="financial-value">
        {denominator > 0 ? `${((value / denominator) * 100).toFixed(2)}%` : "—"}
      </span>
    );
  return (
    <span className="financial-value">
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: compact ? 1 : 2,
        notation: compact ? "compact" : "standard",
      }).format(value)}
    </span>
  );
}
