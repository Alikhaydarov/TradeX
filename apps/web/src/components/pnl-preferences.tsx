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
  return (
    <PnlContext.Provider value={{ mode, balance }}>
      <PnlSetter.Provider value={setMode}>
        <div data-pnl-mode={mode}>{children}</div>
      </PnlSetter.Provider>
    </PnlContext.Provider>
  );
}
const PnlSetter = createContext<(mode: PnlMode) => void>(() => {});

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
              document.cookie = `tradoxy_pnl=${option.value}; Path=/; Max-Age=31536000; SameSite=Lax`;
              try {
                localStorage.setItem("tradoxy:pnl-mode", option.value);
              } catch {
                /* Preferences still work when storage is unavailable. */
              }
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
