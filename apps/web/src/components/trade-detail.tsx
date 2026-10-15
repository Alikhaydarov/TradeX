"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, ImagePlus, Pencil, Trash2, X } from "lucide-react";
import { Money } from "./pnl-preferences";
import { clientApi } from "@/lib/client-api";

type Trade = {
  id: string; account_name: string | null; symbol: string; side: string;
  entry_price: number | null; exit_price: number | null; quantity: number | null;
  fees: number | null; pnl: number | null; note: string | null;
  traded_at: string | null; result_r: number | null; risk_amount: number | null;
  market_type: string | null; setup: string | null; emotion: string | null;
  session: string | null; following_plan: boolean | null; error_made: boolean | null;
  mistake_type: string | null; review_completed: boolean | null;
  image_url: string | null; tags: string[] | null; external_source: string | null;
};

const amount = (value: number | null) => value == null ? "—" : Number(value).toLocaleString(undefined, { maximumFractionDigits: 5 });
const date = (value: string | null) => value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

export function TradeDetail({ initialTrade }: { initialTrade: Trade }) {
  const router = useRouter();
  const [trade, setTrade] = useState(initialTrade);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
      const { trade: updated } = await clientApi<{ trade: Trade }>(`/api/trades/${trade.id}`, {
        method: "PATCH", body: JSON.stringify(fields),
      });
      setTrade(updated);
      setEditing(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Trade could not be saved.");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (busy || !window.confirm(`Delete ${trade.symbol} from your journal?`)) return;
    setBusy(true);
    setError("");
    try {
      await clientApi(`/api/trades/${trade.id}`, { method: "DELETE" });
      router.replace("/trades");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Trade could not be deleted.");
      setBusy(false);
    }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || uploading) return;
    setUploading(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch(`/api/trades/${trade.id}/image`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      setTrade((current) => ({ ...current, image_url: JSON.stringify(result.images) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed."); }
    finally { setUploading(false); event.target.value = ""; }
  }

  let images: string[] = [];
  if (trade.image_url) {
    try {
      const parsed: unknown = JSON.parse(trade.image_url);
      images = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [trade.image_url];
    } catch { images = [trade.image_url]; }
  }

  return <main className="trade-detail-page">
    <div className="trade-detail-topline"><Link href="/trades"><ArrowLeft size={16} /> Trades</Link><span>/</span><span>{trade.symbol}</span></div>
    <header className="trade-detail-header">
      <div><p className="section-label">TRADE REVIEW</p><h1>{trade.symbol} <span className={trade.side === "Long" ? "text-profit" : "text-loss"}>{trade.side}</span></h1><p>{trade.account_name || "Main account"} · {date(trade.traded_at)}</p></div>
      <div className="trade-detail-actions"><button type="button" onClick={() => setEditing(!editing)} disabled={busy}>{editing ? <X size={16} /> : <Pencil size={16} />}{editing ? "Cancel" : "Edit review"}</button><button className="danger" type="button" onClick={() => void remove()} disabled={busy}><Trash2 size={16} /> Delete</button></div>
    </header>
    {error && <p className="trade-error" role="alert">{error}</p>}
    <section className="trade-detail-summary" aria-label="Trade result"><div><span>Realized P&amp;L</span><strong className={Number(trade.pnl) >= 0 ? "positive" : "negative"}><Money value={Number(trade.pnl ?? 0)} /></strong></div><div><span>Risk / reward</span><strong>{trade.result_r == null ? "—" : `${amount(trade.result_r)}R`}</strong></div><div><span>Risk amount</span><strong>{trade.risk_amount == null ? "—" : `$${amount(trade.risk_amount)}`}</strong></div></section>
    <div className="trade-detail-grid">
      <section className="trade-detail-panel"><h2>Execution</h2><dl>{[["Entry price", amount(trade.entry_price)], ["Exit price", amount(trade.exit_price)], ["Position size", amount(trade.quantity)], ["Fees", trade.fees == null ? "—" : `$${amount(trade.fees)}`], ["Market", trade.market_type || "—"], ["Session", trade.session || "—"], ["Source", trade.external_source || "Manual"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      <section className="trade-detail-panel"><h2>Review</h2>{editing ? <form onSubmit={save} className="trade-review-form">
        {!trade.external_source && <><label>Symbol<input name="symbol" defaultValue={trade.symbol} required /></label><label>Side<select name="side" defaultValue={trade.side}><option>Long</option><option>Short</option></select></label><label>Entry price<input name="entryPrice" type="number" step="any" min="0.00000001" defaultValue={trade.entry_price ?? ""} required /></label><label>Exit price<input name="exitPrice" type="number" step="any" min="0.00000001" defaultValue={trade.exit_price ?? ""} required /></label><label>Size<input name="quantity" type="number" step="any" min="0.00000001" defaultValue={trade.quantity ?? ""} required /></label><label>Fees<input name="fees" type="number" step="any" min="0" defaultValue={trade.fees ?? 0} required /></label><label>Risk amount<input name="riskAmount" type="number" step="any" min="0" defaultValue={trade.risk_amount ?? 0} required /></label><label>Date<input name="tradedAt" type="date" defaultValue={trade.traded_at?.slice(0, 10) ?? ""} required /></label></>}
        <label>Setup<input name="setup" defaultValue={trade.setup || ""} maxLength={120} /></label><label>Session<input name="session" defaultValue={trade.session || ""} maxLength={80} /></label><label>Emotion<input name="emotion" defaultValue={trade.emotion || ""} maxLength={80} /></label><label>Mistake<input name="mistakeType" defaultValue={trade.mistake_type || ""} maxLength={160} /></label><label>Notes<textarea name="note" defaultValue={trade.note || ""} maxLength={5000} rows={5} /></label><label className="trade-review-check"><input type="checkbox" name="followingPlan" defaultChecked={trade.following_plan === true} /> Followed plan</label><label className="trade-review-check"><input type="checkbox" name="errorMade" defaultChecked={trade.error_made === true} /> Made a mistake</label><label className="trade-review-check"><input type="checkbox" name="reviewCompleted" defaultChecked={trade.review_completed === true} /> Review complete</label><button type="submit" disabled={busy}><Check size={16} /> {busy ? "Saving..." : "Save trade"}</button></form> : <><div className="trade-review-facts"><div><span>Setup</span><strong>{trade.setup || "Not recorded"}</strong></div><div><span>Emotion</span><strong>{trade.emotion || "Not recorded"}</strong></div><div><span>Plan</span><strong>{trade.following_plan == null ? "Not reviewed" : trade.following_plan ? "Followed" : "Not followed"}</strong></div><div><span>Status</span><strong>{trade.review_completed ? "Reviewed" : "Needs review"}</strong></div></div><p className="trade-review-note">{trade.note || "No notes yet. Add what you saw and what you would repeat."}</p></>}</section>
      <section className="trade-detail-panel trade-detail-media"><div className="trade-media-heading"><h2>Screenshots</h2><label><ImagePlus size={15} /> {uploading ? "Uploading..." : "Add image"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void upload(event)} disabled={uploading || images.length >= 3} hidden /></label></div>{images.length ? <div>{images.map((url) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><Image src={url} alt={`${trade.symbol} trade screenshot`} width={260} height={220} unoptimized /></a>)}</div> : <p>No screenshots attached.</p>}</section>
    </div>
  </main>;
}
