"use client";

import dynamic from "next/dynamic";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Copy,
  Edit3,
  ImagePlus,
  LoaderCircle,
  Save,
  Share2,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MediaImage } from "@/components/media-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteCachedTradeDetail,
  fetchTradeDetail,
  getCachedTradeDetail,
  setCachedTradeDetail,
} from "../trade-detail-data-store";

const TradingViewChart = dynamic(
  () =>
    import("@/components/tradingview-chart").then(
      (module) => module.TradingViewChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[320px] place-items-center bg-xcanvas text-xmuted sm:h-[420px] lg:h-[520px]">
        <div className="text-center">
          <span className="mx-auto block size-2 animate-pulse rounded-full bg-zinc-600" />
          <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wider">
            Preparing chart
          </span>
        </div>
      </div>
    ),
  },
);

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const CARD = "overflow-hidden rounded-2xl border border-xborder bg-xsurface shadow-none";
const LABEL = "text-[10px] font-bold uppercase tracking-[0.14em] text-xmuted";
const INPUT = "mt-1.5 h-10 text-sm";

interface TradeRow {
  id: string;
  prop_account_id?: string | null;
  symbol: string;
  side: "Long" | "Short";
  entry_price?: string | number | null;
  exit_price?: string | number | null;
  quantity?: string | number | null;
  fees?: string | number | null;
  pnl?: string | number | null;
  note?: string | null;
  traded_at?: string | null;
  account_name?: string | null;
  market_type?: string | null;
  setup?: string | null;
  emotion?: string | null;
  risk_amount?: string | number | null;
  result_r?: string | number | null;
  risk_percent?: string | null;
  session?: string | null;
  following_plan?: boolean | null;
  error_made?: boolean | null;
  mistake_type?: string | null;
  review_completed?: boolean | null;
  to_trading_bible?: boolean | null;
  image_url?: string | null;
  tags?: string[] | null;
}

interface TradeModel {
  id: string;
  symbol: string;
  side: "Long" | "Short";
  entry: number;
  exit: number;
  quantity: number;
  fees: number;
  pnl: number;
  note: string;
  tradedAt: string;
  accountName: string;
  marketType: string;
  setup: string;
  emotion: string;
  riskAmount: number;
  resultR: number;
  riskPercent: string;
  session: string;
  followingPlan: boolean;
  errorMade: boolean;
  mistakeType: string;
  reviewCompleted: boolean;
  toTradingBible: boolean;
  imageUrls: string[];
  tags: string[];
}

interface EditableTrade {
  symbol: string;
  side: "Long" | "Short";
  pnl: string;
  quantity: string;
  fees: string;
  tradedAt: string;
  setup: string;
  session: string;
  riskAmount: string;
  resultR: string;
  riskPercent: string;
  note: string;
  tags: string;
  followingPlan: boolean;
  errorMade: boolean;
  mistakeType: string;
  reviewCompleted: boolean;
  toTradingBible: boolean;
  imageUrls: string[];
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseImages(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .slice(0, 3);
    }
  } catch {
    // Legacy rows can contain one plain URL.
  }
  return [value];
}

function modelFrom(row: TradeRow): TradeModel {
  return {
    id: row.id,
    symbol: String(row.symbol || "TRADE").toUpperCase(),
    side: row.side === "Short" ? "Short" : "Long",
    entry: numberValue(row.entry_price),
    exit: numberValue(row.exit_price),
    quantity: numberValue(row.quantity),
    fees: numberValue(row.fees),
    pnl: numberValue(row.pnl),
    note: row.note || "",
    tradedAt: String(row.traded_at || "").slice(0, 10),
    accountName: row.account_name || "Trading account",
    marketType: row.market_type || "Market",
    setup: row.setup || "",
    emotion: row.emotion || "Neutral",
    riskAmount: numberValue(row.risk_amount),
    resultR: numberValue(row.result_r),
    riskPercent: row.risk_percent || "",
    session: row.session || "",
    followingPlan: row.following_plan ?? true,
    errorMade: row.error_made ?? false,
    mistakeType: row.mistake_type || "",
    reviewCompleted: row.review_completed ?? false,
    toTradingBible: row.to_trading_bible ?? false,
    imageUrls: parseImages(row.image_url),
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
  };
}

function editableFrom(trade: TradeModel): EditableTrade {
  return {
    symbol: trade.symbol,
    side: trade.side,
    pnl: String(trade.pnl),
    quantity: String(trade.quantity || 1),
    fees: String(trade.fees),
    tradedAt: trade.tradedAt,
    setup: trade.setup,
    session: trade.session,
    riskAmount: String(trade.riskAmount),
    resultR: String(trade.resultR),
    riskPercent: trade.riskPercent,
    note: trade.note,
    tags: trade.tags.join(", "),
    followingPlan: trade.followingPlan,
    errorMade: trade.errorMade,
    mistakeType: trade.mistakeType,
    reviewCompleted: trade.reviewCompleted,
    toTradingBible: trade.toTradingBible,
    imageUrls: trade.imageUrls,
  };
}

function formatDate(value: string) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
}

function DetailItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-xborder bg-xpanel px-3 py-3">
      <p className={LABEL}>{label}</p>
      <p
        className={`mt-1.5 truncate text-sm font-semibold tabular-nums ${
          tone === "good"
            ? "text-emerald-300"
            : tone === "bad"
              ? "text-rose-300"
              : "text-zinc-100"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1540px] space-y-4 p-3 pb-24 sm:p-4 lg:p-5"
      role="status"
      aria-label="Loading trade"
    >
      <div className="h-24 animate-pulse rounded-2xl border border-xborder bg-xsurface" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(340px,.84fr)]">
        <div className="h-80 animate-pulse rounded-2xl border border-xborder bg-xsurface" />
        <div className="h-80 animate-pulse rounded-2xl border border-xborder bg-xsurface" />
      </div>
    </div>
  );
}

export function TradeDetailPage({
  tradeId,
  onBack,
}: {
  tradeId: string;
  onBack: () => void;
}) {
  const cachedRow = getCachedTradeDetail<TradeRow>(tradeId);
  const cachedTrade = cachedRow ? modelFrom(cachedRow) : null;
  const [trade, setTrade] = useState<TradeModel | null>(() => cachedTrade);
  const [draft, setDraft] = useState<EditableTrade | null>(() =>
    cachedTrade ? editableFrom(cachedTrade) : null,
  );
  const [loading, setLoading] = useState(() => !cachedTrade);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applyRow = useCallback((row: TradeRow) => {
    const next = modelFrom(row);
    setTrade(next);
    setDraft(editableFrom(next));
  }, []);

  const loadTrade = useCallback(
    async (force = false) => {
      const current = getCachedTradeDetail<TradeRow>(tradeId);
      if (current) {
        applyRow(current);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const row = await fetchTradeDetail<TradeRow>({ tradeId, force });
        applyRow(row);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Trade could not be loaded.",
        );
      } finally {
        setLoading(false);
      }
    },
    [applyRow, tradeId],
  );

  useEffect(() => {
    void loadTrade();
  }, [loadTrade]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const reviewScore = useMemo(() => {
    if (!trade) return 0;
    const completed = [
      Boolean(trade.note),
      Boolean(trade.setup),
      Boolean(trade.session),
      trade.imageUrls.length > 0,
      trade.followingPlan,
      trade.reviewCompleted,
    ].filter(Boolean).length;
    return Math.round((completed / 6) * 100);
  }, [trade]);

  const updateDraft = <K extends keyof EditableTrade>(
    key: K,
    value: EditableTrade[K],
  ) => {
    setDraft((current) =>
      current ? { ...current, [key]: value } : current,
    );
  };

  const saveTrade = async () => {
    if (!draft || !trade || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/journal/${encodeURIComponent(trade.id)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: draft.symbol,
            side: draft.side,
            pnl: numberValue(draft.pnl),
            quantity: Math.max(0.0001, numberValue(draft.quantity)),
            fees: Math.max(0, numberValue(draft.fees)),
            tradedAt: draft.tradedAt,
            setup: draft.setup,
            session: draft.session,
            riskAmount: Math.max(0, numberValue(draft.riskAmount)),
            resultR: numberValue(draft.resultR),
            riskPercent: draft.riskPercent,
            note: draft.note,
            tags: draft.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            followingPlan: draft.followingPlan,
            errorMade: draft.errorMade,
            mistakeType: draft.mistakeType,
            reviewCompleted: draft.reviewCompleted,
            toTradingBible: draft.toTradingBible,
            imageUrls: draft.imageUrls,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        entry?: TradeRow;
        error?: string;
      } | null;
      if (!response.ok || !payload?.entry) {
        throw new Error(payload?.error || "Trade was not saved.");
      }
      setCachedTradeDetail(trade.id, payload.entry);
      applyRow(payload.entry);
      setEditing(false);
      setToast("Trade saved");
      window.dispatchEvent(new Event("tradox:journal-updated"));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Trade was not saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteTrade = async () => {
    if (
      !trade ||
      deleting ||
      !window.confirm(`Delete ${trade.symbol} trade?`)
    ) {
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/journal/${encodeURIComponent(trade.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Trade was not deleted.");
      }
      deleteCachedTradeDetail(trade.id);
      window.dispatchEvent(new Event("tradox:journal-updated"));
      onBack();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Trade was not deleted.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const uploadImages = async (files?: FileList | null) => {
    if (!draft || uploading) return;
    const selected = Array.from(files ?? []).slice(
      0,
      3 - draft.imageUrls.length,
    );
    if (!selected.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.append("image", file);
        const response = await fetch("/api/journal/image", {
          method: "POST",
          credentials: "same-origin",
          body: form,
        });
        const payload = (await response.json().catch(() => null)) as {
          imageUrl?: string;
          error?: string;
        } | null;
        if (!response.ok || !payload?.imageUrl) {
          throw new Error(payload?.error || "Screenshot upload failed.");
        }
        uploaded.push(payload.imageUrl);
      }
      updateDraft(
        "imageUrls",
        [...draft.imageUrls, ...uploaded].slice(0, 3),
      );
      setEditing(true);
      setToast("Screenshot uploaded — save changes");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Screenshot upload failed.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast("Trade link copied");
    } catch {
      setToast("Could not copy link");
    }
  };

  const shareTrade = async () => {
    if (!trade) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${trade.symbol} trade`,
          text: `${trade.side} · ${money.format(trade.pnl)} · ${trade.resultR.toFixed(2)}R`,
          url: window.location.href,
        });
        return;
      } catch (shareError) {
        if (shareError instanceof Error && shareError.name === "AbortError") {
          return;
        }
      }
    }
    await copyLink();
  };

  if (loading && !trade) return <PageSkeleton />;

  if (!trade || !draft) {
    return (
      <div className="mx-auto grid min-h-[70dvh] max-w-2xl place-items-center p-4 text-center">
        <div className="rounded-2xl border border-xborder bg-xsurface p-7">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-rose-400/10 text-rose-300">
            <X size={22} />
          </div>
          <h1 className="mt-4 text-xl font-black text-white">
            Trade not found
          </h1>
          <p className="mt-2 text-sm leading-6 text-xmuted">
            {error ||
              "This trade may have been deleted or does not belong to your account."}
          </p>
          <Button className="mt-5" onClick={onBack}>
            <ArrowLeft size={16} /> Back to trades
          </Button>
        </div>
      </div>
    );
  }

  const positive = trade.pnl >= 0;
  const longSide = trade.side === "Long";

  return (
    <div className="mx-auto max-w-[1540px] space-y-4 p-3 pb-28 sm:p-4 sm:pb-8 lg:p-5">
      {toast ? (
        <div className="fixed right-3 top-3 z-[10000] rounded-xl border border-xborder bg-xraised/95 px-3 py-2 text-xs font-semibold text-zinc-100 shadow-2xl backdrop-blur">
          {toast}
        </div>
      ) : null}

      <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-xmuted">
        <button
          type="button"
          onClick={onBack}
          className="transition hover:text-white"
        >
          Trades
        </button>
        <span>/</span>
        <span className="truncate text-zinc-400">{trade.symbol}</span>
      </div>

      <Card className={CARD}>
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onBack}
                className="shrink-0"
              >
                <ArrowLeft size={17} />
              </Button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
                    {trade.symbol}
                  </h1>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${
                      longSide
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-rose-400/10 text-rose-300"
                    }`}
                  >
                    {longSide ? "Buy" : "Sell"}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-xmuted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={13} /> {formatDate(trade.tradedAt)}
                  </span>
                  <span>{trade.accountName}</span>
                  <span>{trade.marketType}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div
                className={`mr-auto rounded-xl border px-3 py-2 text-left lg:mr-2 ${
                  positive
                    ? "border-emerald-400/15 bg-emerald-400/[.055]"
                    : "border-rose-400/15 bg-rose-400/[.055]"
                }`}
              >
                <p className={LABEL}>Net P&amp;L</p>
                <p
                  className={`mt-0.5 font-mono text-lg font-black ${
                    positive ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {positive ? "+" : ""}
                  {money.format(trade.pnl)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void shareTrade()}
              >
                <Share2 size={15} />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyLink()}
              >
                <Copy size={15} />
                <span className="hidden sm:inline">Copy link</span>
              </Button>
              <Button
                type="button"
                onClick={() => setEditing((current) => !current)}
                variant={editing ? "secondary" : "default"}
              >
                {editing ? <X size={15} /> : <Edit3 size={15} />}
                {editing ? "Cancel" : "Edit"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void deleteTrade()}
                disabled={deleting}
                className="border-rose-400/15 bg-rose-400/[.055] text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"
              >
                {deleting ? (
                  <LoaderCircle className="animate-spin" size={15} />
                ) : (
                  <Trash2 size={15} />
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-xborder sm:grid-cols-4 lg:grid-cols-6">
            {[
              ["Entry", trade.entry ? String(trade.entry) : "—"],
              ["Exit", trade.exit ? String(trade.exit) : "—"],
              ["Quantity", trade.quantity ? String(trade.quantity) : "—"],
              ["Fees", money.format(trade.fees)],
              ["Result", `${trade.resultR.toFixed(2)}R`],
              ["Review", `${reviewScore}%`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 border-b border-r border-xborder px-3 py-3 last:border-r-0 sm:border-b-0"
              >
                <p className={LABEL}>{label}</p>
                <p className="mt-1 truncate text-sm font-bold tabular-nums text-zinc-100">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-400/15 bg-rose-400/[.055] px-3 py-2.5 text-xs text-rose-200">
          <X size={14} className="shrink-0" /> {error}
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(340px,.84fr)]">
        <div className="space-y-4">
          <Card className={CARD}>
            <SectionHeader
              eyebrow="Execution"
              title="Trade details"
              icon={<BarChart3 size={18} />}
            />
            <CardContent className="p-4 sm:p-5">
              {editing ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Symbol">
                    <Input
                      value={draft.symbol}
                      onChange={(event) =>
                        updateDraft("symbol", event.target.value.toUpperCase())
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Side">
                    <div className="mt-1.5 grid h-10 grid-cols-2 rounded-lg border border-xborder bg-xpanel p-1">
                      {(["Long", "Short"] as const).map((side) => (
                        <button
                          key={side}
                          type="button"
                          onClick={() => updateDraft("side", side)}
                          className={`rounded-md text-xs font-bold ${
                            draft.side === side
                              ? "bg-white text-black"
                              : "text-xmuted hover:text-white"
                          }`}
                        >
                          {side}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Trade date">
                    <Input
                      type="date"
                      value={draft.tradedAt}
                      onChange={(event) =>
                        updateDraft("tradedAt", event.target.value)
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="P&L">
                    <Input
                      inputMode="decimal"
                      value={draft.pnl}
                      onChange={(event) => updateDraft("pnl", event.target.value)}
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Quantity">
                    <Input
                      inputMode="decimal"
                      value={draft.quantity}
                      onChange={(event) =>
                        updateDraft("quantity", event.target.value)
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Fees">
                    <Input
                      inputMode="decimal"
                      value={draft.fees}
                      onChange={(event) =>
                        updateDraft("fees", event.target.value)
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Risk amount">
                    <Input
                      inputMode="decimal"
                      value={draft.riskAmount}
                      onChange={(event) =>
                        updateDraft("riskAmount", event.target.value)
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Result R">
                    <Input
                      inputMode="decimal"
                      value={draft.resultR}
                      onChange={(event) =>
                        updateDraft("resultR", event.target.value)
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Risk %">
                    <Input
                      value={draft.riskPercent}
                      onChange={(event) =>
                        updateDraft("riskPercent", event.target.value)
                      }
                      className={INPUT}
                    />
                  </Field>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailItem label="Symbol" value={trade.symbol} />
                  <DetailItem
                    label="Side"
                    value={longSide ? "Buy" : "Sell"}
                    tone={longSide ? "good" : "bad"}
                  />
                  <DetailItem
                    label="Trade date"
                    value={formatDate(trade.tradedAt)}
                  />
                  <DetailItem
                    label="Entry price"
                    value={trade.entry ? String(trade.entry) : "—"}
                  />
                  <DetailItem
                    label="Exit price"
                    value={trade.exit ? String(trade.exit) : "—"}
                  />
                  <DetailItem
                    label="Lot / quantity"
                    value={trade.quantity ? String(trade.quantity) : "—"}
                  />
                  <DetailItem
                    label="Risk amount"
                    value={trade.riskAmount ? money.format(trade.riskAmount) : "—"}
                  />
                  <DetailItem
                    label="Risk percent"
                    value={trade.riskPercent || "—"}
                  />
                  <DetailItem
                    label="Net P&L"
                    value={`${positive ? "+" : ""}${money.format(trade.pnl)}`}
                    tone={positive ? "good" : "bad"}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={CARD}>
            <SectionHeader
              eyebrow="Playbook"
              title="Strategy & discipline"
              icon={<ShieldCheck size={18} />}
            />
            <CardContent className="p-4 sm:p-5">
              {editing ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Strategy / setup">
                      <Input
                        value={draft.setup}
                        onChange={(event) =>
                          updateDraft("setup", event.target.value)
                        }
                        className={INPUT}
                        placeholder="Turtle Soup, OTE, FVG..."
                      />
                    </Field>
                    <Field label="Session">
                      <Input
                        value={draft.session}
                        onChange={(event) =>
                          updateDraft("session", event.target.value)
                        }
                        className={INPUT}
                        placeholder="London, New York..."
                      />
                    </Field>
                    <Field label="Tags" className="sm:col-span-2">
                      <Input
                        value={draft.tags}
                        onChange={(event) =>
                          updateDraft("tags", event.target.value)
                        }
                        className={INPUT}
                        placeholder="liquidity, A+, reversal"
                      />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <ToggleRow
                      label="Followed the trading plan"
                      checked={draft.followingPlan}
                      onChange={(value) => updateDraft("followingPlan", value)}
                    />
                    <ToggleRow
                      label="Review completed"
                      checked={draft.reviewCompleted}
                      onChange={(value) => updateDraft("reviewCompleted", value)}
                    />
                    <ToggleRow
                      label="Execution mistake made"
                      checked={draft.errorMade}
                      onChange={(value) => updateDraft("errorMade", value)}
                    />
                    <ToggleRow
                      label="Save to Trading Bible"
                      checked={draft.toTradingBible}
                      onChange={(value) => updateDraft("toTradingBible", value)}
                    />
                  </div>
                  {draft.errorMade ? (
                    <Field label="Mistake type" className="mt-3 block">
                      <Input
                        value={draft.mistakeType}
                        onChange={(event) =>
                          updateDraft("mistakeType", event.target.value)
                        }
                        className={INPUT}
                      />
                    </Field>
                  ) : null}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <DetailItem
                      label="Strategy"
                      value={trade.setup || "Uncategorized"}
                    />
                    <DetailItem
                      label="Session"
                      value={trade.session || "Not selected"}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      tone={trade.followingPlan ? "positive" : "warning"}
                      icon={<CheckCircle2 size={12} />}
                      label={trade.followingPlan ? "Plan followed" : "Off-plan"}
                    />
                    <StatusPill
                      tone={trade.reviewCompleted ? "info" : "neutral"}
                      label={trade.reviewCompleted ? "Reviewed" : "Review pending"}
                    />
                    {trade.errorMade ? (
                      <StatusPill
                        tone="negative"
                        label={trade.mistakeType || "Mistake recorded"}
                      />
                    ) : null}
                    {trade.toTradingBible ? (
                      <StatusPill tone="info" label="Trading Bible" />
                    ) : null}
                  </div>
                  {trade.tags.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {trade.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-lg border border-xborder bg-xpanel px-2 py-1 text-[10px] text-zinc-400"
                        >
                          <Tag size={10} /> {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className={CARD}>
            <SectionHeader
              eyebrow="Visual review"
              title="Screenshots"
              icon={
                <span className="text-xs font-semibold text-xmuted">
                  {draft.imageUrls.length}/3
                </span>
              }
            />
            <CardContent className="p-4 sm:p-5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => void uploadImages(event.target.files)}
              />
              {draft.imageUrls.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {draft.imageUrls.map((url, index) => (
                    <div
                      key={url}
                      className={`group relative overflow-hidden rounded-xl border border-xborder bg-xcanvas ${
                        index === 0
                          ? "sm:col-span-2 xl:col-span-1 2xl:col-span-2"
                          : ""
                      }`}
                    >
                      <MediaImage
                        src={url}
                        alt={`${trade.symbol} screenshot ${index + 1}`}
                        className={`w-full object-contain ${
                          index === 0 ? "h-56 sm:h-72 xl:h-64" : "h-40"
                        }`}
                      />
                      {editing ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(
                              "imageUrls",
                              draft.imageUrls.filter((item) => item !== url),
                            )
                          }
                          className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-black/85 text-rose-300 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Remove screenshot"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="grid min-h-64 w-full place-items-center rounded-xl border border-dashed border-xborder bg-xpanel text-center transition hover:border-xborder-strong hover:bg-xraised"
                >
                  <span>
                    <ImagePlus className="mx-auto text-xmuted" size={28} />
                    <span className="mt-3 block text-sm font-bold text-zinc-200">
                      Upload screenshot
                    </span>
                    <span className="mt-1 block text-[11px] text-xmuted">
                      PNG, JPG or WEBP · up to 3 images
                    </span>
                  </span>
                </button>
              )}
              {draft.imageUrls.length < 3 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-3 w-full"
                >
                  {uploading ? (
                    <LoaderCircle className="animate-spin" size={15} />
                  ) : (
                    <ImagePlus size={15} />
                  )}
                  Add screenshot
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className={CARD}>
            <SectionHeader
              eyebrow="Journal"
              title="Notes"
              icon={<Clipboard size={18} />}
            />
            <CardContent className="p-4 sm:p-5">
              {editing ? (
                <Textarea
                  value={draft.note}
                  onChange={(event) => updateDraft("note", event.target.value)}
                  className="min-h-48 leading-6"
                  placeholder="What happened before, during and after this trade?"
                />
              ) : trade.note ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                  {trade.note}
                </p>
              ) : (
                <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-xborder bg-xpanel px-5 text-center">
                  <div>
                    <Clipboard className="mx-auto text-xmuted" size={23} />
                    <p className="mt-3 text-sm font-bold text-zinc-300">
                      No trade notes yet
                    </p>
                    <p className="mt-1 text-xs text-xmuted">
                      Add execution context and the lesson from this trade.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className={CARD}>
        <SectionHeader
          eyebrow="Market context"
          title="TradingView chart"
          icon={
            <span className="text-xs font-semibold text-xmuted">
              {trade.symbol} · 1H
            </span>
          }
        />
        <TradingViewChart
          symbol={trade.symbol}
          className="h-[320px] sm:h-[420px] lg:h-[520px]"
        />
      </Card>

      {editing ? (
        <div className="fixed inset-x-0 bottom-0 z-[9998] border-t border-xborder bg-xcanvas/94 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto flex max-w-[1540px] gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(editableFrom(trade));
                setEditing(false);
              }}
              className="flex-1 sm:flex-none"
            >
              <X size={15} /> Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveTrade()}
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              {saving ? (
                <LoaderCircle className="animate-spin" size={15} />
              ) : (
                <Save size={15} />
              )}
              Save changes
            </Button>
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-[9998] grid grid-cols-3 gap-2 border-t border-xborder bg-xcanvas/94 p-3 backdrop-blur sm:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            <Edit3 size={15} /> Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={15} /> Image
          </Button>
          <Button type="button" onClick={() => void shareTrade()}>
            <Share2 size={15} /> Share
          </Button>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-xborder px-4 py-3.5 sm:px-5">
      <div>
        <p className={LABEL}>{eyebrow}</p>
        <h2 className="mt-1 text-base font-black text-white">{title}</h2>
      </div>
      <span className="text-xmuted">{icon}</span>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`${LABEL} ${className}`}>
      {label}
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-xborder bg-xpanel px-3 text-sm text-zinc-300">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(Boolean(value))}
      />
      {label}
    </label>
  );
}

function StatusPill({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: "positive" | "negative" | "warning" | "info" | "neutral";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "bg-emerald-400/10 text-emerald-300"
      : tone === "negative"
        ? "bg-rose-400/10 text-rose-300"
        : tone === "warning"
          ? "bg-amber-400/10 text-amber-300"
          : tone === "info"
            ? "bg-sky-400/10 text-sky-300"
            : "bg-xpanel text-xmuted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${toneClass}`}
    >
      {icon}
      {label}
    </span>
  );
}
