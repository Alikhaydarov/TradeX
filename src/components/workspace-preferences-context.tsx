"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type PnlViewMode = "money" | "percentage" | "hidden";
export type TradeSortMode = "entryDate" | "exitDate";

interface WorkspacePreferencesValue {
  pnlMode: PnlViewMode;
  tradeSort: TradeSortMode;
  hidePersonalInfo: boolean;
  fontFamily: string;
  customSymbols: string[];
  settingsOpen: boolean;
  setPnlMode: (value: PnlViewMode) => void;
  setTradeSort: (value: TradeSortMode) => void;
  setHidePersonalInfo: (value: boolean) => void;
  setFontFamily: (value: string) => void;
  setSettingsOpen: (value: boolean) => void;
  addCustomSymbol: (value: string) => void;
  removeCustomSymbol: (value: string) => void;
  formatPnl: (value: number, baseValue?: number) => string;
  maskValue: (value: string) => string;
}

const DEFAULT_SYMBOLS = ["NAS100", "XAUUSD", "EURUSD", "GBPUSD", "US30", "GER30", "BTCUSD"];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const STORAGE_KEYS = {
  pnlMode: "tradeway:pnl-mode",
  tradeSort: "tradeway:trade-sort",
  hidePersonalInfo: "tradeway:hide-personal-info",
  fontFamily: "tradeway:font-family",
  customSymbols: "tradeway:custom-symbols",
} as const;

const WorkspacePreferencesContext = createContext<WorkspacePreferencesValue | null>(null);

function readLocalStorage<T>(key: string, fallback: T, parse?: (raw: string) => T) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    return parse ? parse(value) : (value as T);
  } catch {
    return fallback;
  }
}

function persist(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

export function WorkspacePreferencesProvider({ children }: { children: ReactNode }) {
  const [pnlMode, setPnlModeState] = useState<PnlViewMode>("money");
  const [tradeSort, setTradeSortState] = useState<TradeSortMode>("exitDate");
  const [hidePersonalInfo, setHidePersonalInfoState] = useState(false);
  const [fontFamily, setFontFamilyState] = useState("Inter");
  const [customSymbols, setCustomSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setPnlModeState(readLocalStorage<PnlViewMode>(STORAGE_KEYS.pnlMode, "money", (raw) => {
      if (raw === "percentage" || raw === "hidden") return raw;
      return "money";
    }));
    setTradeSortState(readLocalStorage<TradeSortMode>(STORAGE_KEYS.tradeSort, "exitDate", (raw) => {
      if (raw === "entryDate") return raw;
      return "exitDate";
    }));
    setHidePersonalInfoState(readLocalStorage<boolean>(STORAGE_KEYS.hidePersonalInfo, false, (raw) => raw === "true"));
    setFontFamilyState(readLocalStorage<string>(STORAGE_KEYS.fontFamily, "Inter"));
    setCustomSymbols(readLocalStorage<string[]>(STORAGE_KEYS.customSymbols, DEFAULT_SYMBOLS, (raw) => {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return DEFAULT_SYMBOLS;
      const merged = [...DEFAULT_SYMBOLS, ...parsed.map((item) => String(item).trim().toUpperCase())];
      return Array.from(new Set(merged)).filter(Boolean);
    }));
  }, []);

  const value = useMemo<WorkspacePreferencesValue>(() => {
    const setPnlMode = (next: PnlViewMode) => {
      setPnlModeState(next);
      persist(STORAGE_KEYS.pnlMode, next);
    };

    const setTradeSort = (next: TradeSortMode) => {
      setTradeSortState(next);
      persist(STORAGE_KEYS.tradeSort, next);
    };

    const setHidePersonalInfo = (next: boolean) => {
      setHidePersonalInfoState(next);
      persist(STORAGE_KEYS.hidePersonalInfo, String(next));
    };

    const setFontFamily = (next: string) => {
      setFontFamilyState(next);
      persist(STORAGE_KEYS.fontFamily, next);
    };

    const addCustomSymbol = (next: string) => {
      const normalized = next.trim().toUpperCase();
      if (!normalized) return;
      setCustomSymbols((current) => {
        const updated = Array.from(new Set([...current, normalized]));
        persist(STORAGE_KEYS.customSymbols, JSON.stringify(updated.filter((item) => !DEFAULT_SYMBOLS.includes(item))));
        return updated;
      });
    };

    const removeCustomSymbol = (next: string) => {
      const normalized = next.trim().toUpperCase();
      if (!normalized || DEFAULT_SYMBOLS.includes(normalized)) return;
      setCustomSymbols((current) => {
        const updated = current.filter((item) => item !== normalized);
        persist(STORAGE_KEYS.customSymbols, JSON.stringify(updated.filter((item) => !DEFAULT_SYMBOLS.includes(item))));
        return updated;
      });
    };

    const formatPnl = (amount: number, baseValue?: number) => {
      if (pnlMode === "hidden") return "••••••";
      if (pnlMode === "percentage") {
        const base = typeof baseValue === "number" && baseValue > 0 ? baseValue : 0;
        const percentage = base ? (amount / base) * 100 : 0;
        return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;
      }
      return `${amount >= 0 ? "+" : ""}${money.format(amount)}`;
    };

    const maskValue = (input: string) => {
      if (!hidePersonalInfo) return input;
      if (!input) return "••••";
      const visible = input.slice(0, Math.min(2, input.length));
      return `${visible}${"•".repeat(Math.max(3, input.length - visible.length))}`;
    };

    return {
      pnlMode,
      tradeSort,
      hidePersonalInfo,
      fontFamily,
      customSymbols,
      settingsOpen,
      setPnlMode,
      setTradeSort,
      setHidePersonalInfo,
      setFontFamily,
      setSettingsOpen,
      addCustomSymbol,
      removeCustomSymbol,
      formatPnl,
      maskValue,
    };
  }, [customSymbols, fontFamily, hidePersonalInfo, pnlMode, settingsOpen, tradeSort]);

  return <WorkspacePreferencesContext.Provider value={value}>{children}</WorkspacePreferencesContext.Provider>;
}

export function useWorkspacePreferences() {
  const context = useContext(WorkspacePreferencesContext);
  if (!context) throw new Error("useWorkspacePreferences must be used inside WorkspacePreferencesProvider");
  return context;
}
