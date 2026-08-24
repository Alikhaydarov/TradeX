"use client";

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
  Maximize2,
  Save,
  Share2,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TradeDetailSkeleton } from "@/components/skeletons/route-skeletons";
import { MediaImage } from "@/components/media-image";
import { TradingViewChart } from "@/components/tradingview-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const CARD = "overflow-hidden rounded-xl border border-white/8 bg-surface shadow-none";
const LABEL = "text-[10px] font-bold uppercase tracking-[0.14em] text-ink-subtle";
const INPUT = "mt-1.5 h-10 border-white/10 bg-surface text-sm";

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
      return parsed.filter((item): item is string => typeof item === "string").slice(0, 3);
    }
  } catch {
    // A legacy row may contain one plain URL instead of JSON.
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

function DetailItem({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="min-w-0 border-b border-white/7 px-0 py-3 sm:border-b-0 sm:border-l sm:px-4 sm:first:border-l-0">
      <p className={LABEL}>{label}</p>
      <p
        className={`mt-1.5 truncate text-sm font-semibold tabular-nums ${
          tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-rose-300" : "text-zinc-100"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export function TradeDetailPage({ tradeId, onBack }: { tradeId: string; onBack: () => void }) {
  const [trade, setTrade] = useState<TradeModel | null>(null);
  const [draft, setDraft] = useState<EditableTrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadTrade = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/journal/${encodeURIComponent(tradeId)}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as { entry?: TradeRow; error?: string } | null;
      if (!response.ok || !payload?.entry) {
        throw new Error(payload?.error || "Trade could not be loaded.");
      }
      const next = modelFrom(payload.entry);
      setTrade(next);
      setDraft(editableFrom(next));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Trade could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

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

  const updateDraft = <K extends keyof EditableTrade>(key: K, value: EditableTrade[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const saveTrade = async () => {
    if (!draft || !trade || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/journal/${encodeURIComponent(trade.id)}`, {
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
          tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          followingPlan: draft.followingPlan,
          errorMade: draft.errorMade,
          mistakeType: draft.mistakeType,
          reviewCompleted: draft.reviewCompleted,
          toTradingBible: draft.toTradingBible,
          imageUrls: draft.imageUrls,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { entry?: TradeRow; error?: string } | null;
      if (!response.ok || !payload?.entry) throw new Error(payload?.error || "Trade was not saved.");
      const next = modelFrom(payload.entry);
      setTrade(next);
      setDraft(editableFrom(next));
      setEditing(false);
      setToast("Trade saved");
      window.dispatchEvent(new Event("tradox:journal-updated"));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Trade was not saved.");
    } finally {
      setSaving(false);
    }
  };

  const deleteTrade = async () => {
    if (!trade || deleting || !window.confirm(`Delete ${trade.symbol} trade?`)) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/journal/${encodeURIComponent(trade.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Trade was not deleted.");
      window.dispatchEvent(new Event("tradox:journal-updated"));
      onBack();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Trade was not deleted.");
    } finally {
      setDeleting(false);
    }
  };

  const uploadImages = async (files?: FileList | null) => {
    if (!draft || uploading) return;
    const selected = Array.from(files ?? []).slice(0, 3 - draft.imageUrls.length);
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
        const payload = (await response.json().catch(() => null)) as { imageUrl?: string; error?: string } | null;
        if (!response.ok || !payload?.imageUrl) throw new Error(payload?.error || "Screenshot upload failed.");
        uploaded.push(payload.imageUrl);
      }
      updateDraft("imageUrls", [...draft.imageUrls, ...uploaded].slice(0, 3));
      setEditing(true);
      setToast("Screenshot uploaded — save changes");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Screenshot upload failed.");
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
      } catch {
        return;
      }
    }
    await copyLink();
  };

  if (loading) return <TradeDetailSkeleton />;

  if (!trade || !draft) {
    return (
      <div className="mx-auto grid min-h-[70dvh] max-w-2xl place-items-center p-4 text-center">
        <div className="rounded-2xl border border-white/10 bg-surface p-7">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-rose-400/10 text-rose-300">
            <X size={22} />
          </div>
          <h1 className="mt-4 text-xl font-black text-white">Trade not found</h1>
          <p className="mt-2 text-sm leading-6 text-ink-mute">{error || "This trade may have been deleted or does not belong to your account."}</p>
          <Button className="mt-5" onClick={onBack}>
            <ArrowLeft size={16} /> Back to trades
          </Button>
        </div>
      </div>
    );
  }

  const positive = trade.pnl >= 0;
  const sideGood = trade.side === "Long";

  return (
    <div className="mx-auto max-w-[1480px] space-y-3 px-3 py-3 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:space-y-4 sm:px-5 sm:py-4 sm:pb-8 lg:px-6">
      {toast ? (
        <div className="fixed right-3 top-3 z-[10000] rounded-xl border border-white/10 bg-surface-raised/95 px-3 py-2 text-xs font-semibold text-zinc-100 shadow-2xl">
          {toast}
        </div>
      ) : null}

      <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-ink-subtle">
        <button type="button" onClick={onBack} className="transition hover:text-white">Trades</button>
        <span>/</span>
        <span className="truncate text-ink-soft">{trade.symbol}</span>
      </div>

      <Card className={CARD}>
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 p-3.5 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <Button type="button" variant="outline" size="icon" onClick={onBack} className="shrink-0 border-white/10 bg-surface">
                <ArrowLeft size={17} />
              </Button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-white sm:text-2xl">{trade.symbol}</h1>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${sideGood ? "border-emerald-400/15 bg-emerald-400/8 text-emerald-300" : "border-rose-400/15 bg-rose-400/8 text-rose-300"}`}>
                    {trade.side === "Long" ? "Buy" : "Sell"}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-mute">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> {formatDate(trade.tradedAt)}</span>
                  <span>{trade.accountName}</span>
                  <span>{trade.marketType}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex sm:flex-wrap lg:justify-end">
              <div className="min-w-0 text-left sm:mr-auto lg:mr-3 lg:text-right">
                <p className={LABEL}>Net P&amp;L</p>
                <p className={`mt-0.5 font-mono text-xl font-bold ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                  {positive ? "+" : ""}{money.format(trade.pnl)}
                </p>
              </div>
              <Button type="button" variant="outline" size="icon" title="Share trade" onClick={() => void shareTrade()} className="border-white/10 bg-surface"><Share2 size={15} /></Button>
              <Button type="button" variant="outline" size="icon" title="Copy trade link" onClick={() => void copyLink()} className="border-white/10 bg-surface"><Copy size={15} /></Button>
              <Button type="button" onClick={() => setEditing((current) => !current)} className={`col-span-2 w-full sm:col-auto sm:w-auto ${editing ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-white text-black hover:bg-zinc-200"}`}>
                {editing ? <X size={15} /> : <Edit3 size={15} />}{editing ? "Cancel" : "Edit"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void deleteTrade()} disabled={deleting} className="border-rose-400/15 bg-rose-400/[.055] text-rose-300 hover:bg-rose-400/10 hover:text-rose-200">
                {deleting ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-white/8 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Entry", trade.entry ? String(trade.entry) : "—"],
              ["Exit", trade.exit ? String(trade.exit) : "—"],
              ["Quantity", trade.quantity ? String(trade.quantity) : "—"],
              ["Fees", money.format(trade.fees)],
              ["Result", `${trade.resultR.toFixed(2)}R`],
              ["Review", `${reviewScore}%`],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 border-b border-r border-white/8 px-4 py-3.5 lg:border-b-0">
                <p className={LABEL}>{label}</p>
                <p className="mt-1 truncate text-sm font-bold tabular-nums text-zinc-100">{value}</p>
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

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
        <div className="space-y-4">
          <Card className={CARD}>
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3.5 sm:px-5">
              <div>
                <p className={LABEL}>Execution</p>
                <h2 className="mt-1 text-base font-black text-white">Trade details</h2>
              </div>
              <BarChart3 size={18} className="text-ink-mute" />
            </div>
            <CardContent className="p-4 sm:p-5">
              {editing ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={LABEL}>Symbol<Input value={draft.symbol} onChange={(event) => updateDraft("symbol", event.target.value.toUpperCase())} className={INPUT} /></label>
                  <label className={LABEL}>Side
                    <div className="mt-1.5 grid h-10 grid-cols-2 rounded-lg border border-white/10 bg-surface p-1">
                      {(["Long", "Short"] as const).map((side) => <button key={side} type="button" onClick={() => updateDraft("side", side)} className={`rounded-md text-xs font-bold ${draft.side === side ? "bg-white text-black" : "text-ink-mute hover:text-white"}`}>{side}</button>)}
                    </div>
                  </label>
                  <label className={LABEL}>Trade date<Input type="date" value={draft.tradedAt} onChange={(event) => updateDraft("tradedAt", event.target.value)} className={INPUT} /></label>
                  <label className={LABEL}>P&amp;L<Input inputMode="decimal" value={draft.pnl} onChange={(event) => updateDraft("pnl", event.target.value)} className={INPUT} /></label>
                  <label className={LABEL}>Quantity<Input inputMode="decimal" value={draft.quantity} onChange={(event) => updateDraft("quantity", event.target.value)} className={INPUT} /></label>
                  <label className={LABEL}>Fees<Input inputMode="decimal" value={draft.fees} onChange={(event) => updateDraft("fees", event.target.value)} className={INPUT} /></label>
                  <label className={LABEL}>Risk amount<Input inputMode="decimal" value={draft.riskAmount} onChange={(event) => updateDraft("riskAmount", event.target.value)} className={INPUT} /></label>
                  <label className={LABEL}>Result R<Input inputMode="decimal" value={draft.resultR} onChange={(event) => updateDraft("resultR", event.target.value)} className={INPUT} /></label>
                  <label className={LABEL}>Risk %<Input value={draft.riskPercent} onChange={(event) => updateDraft("riskPercent", event.target.value)} className={INPUT} /></label>
                </div>
              ) : (
                <div className="grid gap-x-0 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailItem label="Symbol" value={trade.symbol} />
                  <DetailItem label="Side" value={trade.side === "Long" ? "Buy" : "Sell"} tone={sideGood ? "good" : "bad"} />
                  <DetailItem label="Trade date" value={formatDate(trade.tradedAt)} />
                  <DetailItem label="Entry price" value={trade.entry ? String(trade.entry) : "—"} />
                  <DetailItem label="Exit price" value={trade.exit ? String(trade.exit) : "—"} />
                  <DetailItem label="Lot / quantity" value={trade.quantity ? String(trade.quantity) : "—"} />
                  <DetailItem label="Risk amount" value={trade.riskAmount ? money.format(trade.riskAmount) : "—"} />
                  <DetailItem label="Risk percent" value={trade.riskPercent || "—"} />
                  <DetailItem label="Net P&L" value={`${positive ? "+" : ""}${money.format(trade.pnl)}`} tone={positive ? "good" : "bad"} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={CARD}>
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3.5 sm:px-5">
              <div>
                <p className={LABEL}>Playbook</p>
                <h2 className="mt-1 text-base font-black text-white">Strategy &amp; discipline</h2>
              </div>
              <ShieldCheck size={18} className="text-ink-mute" />
            </div>
            <CardContent className="p-4 sm:p-5">
              {editing ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={LABEL}>Strategy / setup<Input value={draft.setup} onChange={(event) => updateDraft("setup", event.target.value)} className={INPUT} placeholder="Turtle Soup, OTE, FVG..." /></label>
                    <label className={LABEL}>Session<Input value={draft.session} onChange={(event) => updateDraft("session", event.target.value)} className={INPUT} placeholder="London, New York..." /></label>
                    <label className={`${LABEL} sm:col-span-2`}>Tags<Input value={draft.tags} onChange={(event) => updateDraft("tags", event.target.value)} className={INPUT} placeholder="liquidity, A+, reversal" /></label>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {[
                      ["followingPlan", "Followed the trading plan"],
                      ["reviewCompleted", "Review completed"],
                      ["errorMade", "Execution mistake made"],
                      ["toTradingBible", "Save to Trading Bible"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex min-h-11 items-center gap-3 rounded-xl border border-white/8 bg-black/35 px-3 text-sm text-ink-strong">
                        <Checkbox checked={Boolean(draft[key as keyof EditableTrade])} onCheckedChange={(checked) => updateDraft(key as "followingPlan" | "reviewCompleted" | "errorMade" | "toTradingBible", Boolean(checked))} />
                        {label}
                      </label>
                    ))}
                  </div>
                  {draft.errorMade ? <label className={`${LABEL} mt-3 block`}>Mistake type<Input value={draft.mistakeType} onChange={(event) => updateDraft("mistakeType", event.target.value)} className={INPUT} /></label> : null}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <DetailItem label="Strategy" value={trade.setup || "Uncategorized"} />
                    <DetailItem label="Session" value={trade.session || "Not selected"} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${trade.followingPlan ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}><CheckCircle2 size={12} />{trade.followingPlan ? "Plan followed" : "Off-plan"}</span>
                    <span className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${trade.reviewCompleted ? "bg-sky-400/10 text-sky-300" : "bg-white/[.05] text-ink-mute"}`}>{trade.reviewCompleted ? "Reviewed" : "Review pending"}</span>
                    {trade.errorMade ? <span className="rounded-lg bg-rose-400/10 px-2.5 py-1.5 text-[10px] font-bold text-rose-300">{trade.mistakeType || "Mistake recorded"}</span> : null}
                    {trade.toTradingBible ? <span className="rounded-lg bg-violet-400/10 px-2.5 py-1.5 text-[10px] font-bold text-violet-300">Trading Bible</span> : null}
                  </div>
                  {trade.tags.length ? <div className="flex flex-wrap gap-1.5">{trade.tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-lg border border-white/8 bg-black/35 px-2 py-1 text-[10px] text-ink-soft"><Tag size={10} />{tag}</span>)}</div> : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className={CARD}>
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3.5 sm:px-5">
              <div>
                <p className={LABEL}>Visual review</p>
                <h2 className="mt-1 text-base font-black text-white">Screenshots</h2>
              </div>
              <span className="text-xs font-semibold text-ink-subtle">{draft.imageUrls.length}/3</span>
            </div>
            <CardContent className="p-4 sm:p-5">
              <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void uploadImages(event.target.files)} />
              {draft.imageUrls.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {draft.imageUrls.map((url, index) => (
                    <div key={url} className={`group relative overflow-hidden rounded-lg border border-white/8 bg-black ${index === 0 ? "sm:col-span-2 xl:col-span-1 2xl:col-span-2" : ""}`}>
                      <button type="button" onClick={() => setPreviewImage(url)} className="block w-full cursor-zoom-in" aria-label={`Open screenshot ${index + 1}`}>
                        <MediaImage src={url} alt={`${trade.symbol} screenshot ${index + 1}`} className={`w-full object-contain transition duration-300 group-hover:scale-[1.01] ${index === 0 ? "h-56 sm:h-72 xl:h-64" : "h-40"}`} />
                      </button>
                      <span className="pointer-events-none absolute bottom-2 right-2 grid size-7 place-items-center rounded-md bg-black/75 text-zinc-200 opacity-0 transition group-hover:opacity-100"><Maximize2 size={12} /></span>
                      {editing ? <button type="button" onClick={() => updateDraft("imageUrls", draft.imageUrls.filter((item) => item !== url))} className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-black/85 text-rose-300 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={13} /></button> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="grid min-h-64 w-full place-items-center rounded-xl border border-dashed border-white/12 bg-black/25 text-center transition hover:border-white/25 hover:bg-white/[.025]">
                  <span><ImagePlus className="mx-auto text-ink-subtle" size={28} /><span className="mt-3 block text-sm font-bold text-zinc-200">Upload screenshot</span><span className="mt-1 block text-[11px] text-ink-subtle">PNG, JPG or WEBP · up to 3 images</span></span>
                </button>
              )}
              {draft.imageUrls.length < 3 ? <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-3 w-full border-white/10 bg-surface">{uploading ? <LoaderCircle className="animate-spin" size={15} /> : <ImagePlus size={15} />} Add screenshot</Button> : null}
            </CardContent>
          </Card>

          <Card className={CARD}>
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3.5 sm:px-5">
              <div>
                <p className={LABEL}>Journal</p>
                <h2 className="mt-1 text-base font-black text-white">Notes</h2>
              </div>
              <Clipboard size={18} className="text-ink-mute" />
            </div>
            <CardContent className="p-4 sm:p-5">
              {editing ? <Textarea value={draft.note} onChange={(event) => updateDraft("note", event.target.value)} className="min-h-48 border-white/10 bg-surface leading-6" placeholder="What happened before, during and after this trade?" /> : trade.note ? <p className="whitespace-pre-wrap text-sm leading-7 text-ink-strong">{trade.note}</p> : <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/8 bg-black/25 px-5 text-center"><div><Clipboard className="mx-auto text-ink-faint" size={23} /><p className="mt-3 text-sm font-bold text-ink-strong">No trade notes yet</p><p className="mt-1 text-xs text-ink-subtle">Add execution context and the lesson from this trade.</p></div></div>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className={CARD}>
        <div className="flex flex-col gap-2 border-b border-white/8 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className={LABEL}>Market context</p>
            <h2 className="mt-1 text-base font-black text-white">TradingView chart</h2>
          </div>
          <span className="text-xs font-semibold text-ink-subtle">{trade.symbol} · 1H</span>
        </div>
        <TradingViewChart symbol={trade.symbol} className="h-[320px] sm:h-[420px] lg:h-[520px]" />
      </Card>

      {editing ? (
        <div className="fixed inset-x-0 bottom-0 z-[9998] border-t border-white/10 bg-black p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto flex max-w-[1540px] gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => { setDraft(editableFrom(trade)); setEditing(false); }} className="flex-1 border-white/10 bg-surface sm:flex-none"><X size={15} /> Cancel</Button>
            <Button type="button" onClick={() => void saveTrade()} disabled={saving} className="flex-1 bg-white text-black hover:bg-zinc-200 sm:flex-none">{saving ? <LoaderCircle className="animate-spin" size={15} /> : <Save size={15} />} Save changes</Button>
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-[9998] grid grid-cols-3 gap-2 border-t border-white/10 bg-black p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:hidden">
          <Button type="button" variant="outline" onClick={() => setEditing(true)} className="border-white/10 bg-surface"><Edit3 size={15} /> Edit</Button>
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="border-white/10 bg-surface"><ImagePlus size={15} /> Image</Button>
          <Button type="button" onClick={() => void shareTrade()} className="bg-white text-black hover:bg-zinc-200"><Share2 size={15} /> Share</Button>
        </div>
      )}

      {previewImage ? (
        <div className="fixed inset-0 z-[10020] grid place-items-center bg-black/95 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Trade screenshot preview" onClick={() => setPreviewImage(null)}>
          <button type="button" onClick={() => setPreviewImage(null)} className="absolute right-4 top-4 grid size-10 place-items-center rounded-lg border border-white/10 bg-zinc-950 text-zinc-200 hover:bg-zinc-900" aria-label="Close preview"><X size={18} /></button>
          <MediaImage src={previewImage} alt={`${trade.symbol} screenshot preview`} className="max-h-[92dvh] max-w-[96vw] object-contain" />
        </div>
      ) : null}
    </div>
  );
}
