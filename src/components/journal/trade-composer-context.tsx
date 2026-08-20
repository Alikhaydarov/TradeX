"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "@/lib/api-client";
import { useActiveAccountStore } from "../active-account-context";
import { useAuth } from "../auth-context";
import {
  invalidateJournalUser,
  journalEntryFromRow,
  setJournalEntries,
  type JournalEntryRow,
} from "./journal-data-store";

const TradeReviewModal = dynamic(
  () =>
    import("../trade-review-modal").then((module) => module.TradeReviewModal),
  { ssr: false },
);

type TradeComposerContextValue = {
  openTradeComposer: () => void;
  saving: boolean;
};

const TradeComposerContext = createContext<TradeComposerContextValue | null>(null);

function numericFormValue(form: FormData, key: string) {
  return parseFloat(String(form.get(key) || "0").replace(",", ".")) || 0;
}

export function TradeComposerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { accounts, activeAccountId } = useActiveAccountStore();
  const account = useMemo(
    () => accounts.find((item) => item.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const openTradeComposer = useCallback(() => {
    if (!activeAccountId) {
      router.push("/accounts");
      return;
    }
    setOpen(true);
  }, [activeAccountId, router]);

  useEffect(() => {
    const handleOpen = () => openTradeComposer();
    window.addEventListener("tradeway:add-trade", handleOpen);
    return () => window.removeEventListener("tradeway:add-trade", handleOpen);
  }, [openTradeComposer]);

  const saveTrade = useCallback(
    async (form: FormData) => {
      if (!account || !user) return null;
      setSaving(true);
      try {
        const response = await apiRequest<{ entry: JournalEntryRow }>(
          "/api/journal",
          {
            method: "POST",
            body: JSON.stringify({
              propAccountId: account.id,
              symbol: form.get("symbol"),
              side: form.get("side"),
              pnl: numericFormValue(form, "pnl"),
              quantity: numericFormValue(form, "quantity"),
              fees: numericFormValue(form, "fees"),
              riskAmount: numericFormValue(form, "riskAmount"),
              resultR: numericFormValue(form, "resultR"),
              riskPercent: form.get("riskPercent"),
              session: form.get("session"),
              followingPlan: form.has("followingPlan"),
              errorMade: form.has("errorMade"),
              mistakeType: form.get("mistakeType"),
              reviewCompleted: form.has("reviewCompleted"),
              toTradingBible: form.has("toTradingBible"),
              tradedAt: form.get("tradedAt"),
              setup: form.get("setup"),
              tags: String(form.get("tags") || "")
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
              note: form.get("note"),
              imageUrls: JSON.parse(String(form.get("imageUrls") || "[]")),
            }),
          },
        );

        const next = journalEntryFromRow(response.entry);
        invalidateJournalUser(user.id);
        setJournalEntries(
          { userId: user.id, mode: "workspace", accountId: account.id },
          (current) => [next, ...current.filter((entry) => entry.id !== next.id)],
        );
        window.dispatchEvent(new Event("tradox:journal-updated"));
        setOpen(false);

        return {
          id: next.id,
          symbol: next.symbol,
          side: next.side,
          pnl: next.pnl,
          resultR: next.resultR ?? null,
          note: next.note ?? null,
          setup: next.setup ?? null,
        };
      } finally {
        setSaving(false);
      }
    },
    [account, user],
  );

  const value = useMemo(
    () => ({ openTradeComposer, saving }),
    [openTradeComposer, saving],
  );

  return (
    <TradeComposerContext.Provider value={value}>
      {children}
      {open ? (
        <TradeReviewModal
          open={open}
          saving={saving}
          account={account}
          onOpenChange={setOpen}
          onSave={saveTrade}
        />
      ) : null}
    </TradeComposerContext.Provider>
  );
}

export function useTradeComposer() {
  const context = useContext(TradeComposerContext);
  if (!context) {
    throw new Error("useTradeComposer must be used inside TradeComposerProvider");
  }
  return context;
}
