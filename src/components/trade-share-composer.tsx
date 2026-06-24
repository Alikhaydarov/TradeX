"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";
import { Dialog, DialogContent } from "./ui/dialog";
import type { JournalEntry } from "./types";

interface TradeShareComposerProps {
  trade: JournalEntry | null;
  onClose: () => void;
}

const cash = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TradeShareComposer({ trade, onClose }: TradeShareComposerProps) {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState("");

  const username =
    String(user?.user_metadata?.user_name ?? user?.email?.split("@")[0] ?? "you");
  const fullName =
    String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? username);
  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  useEffect(() => {
    if (!trade) {
      setCaption(""); setShared(false); setError("");
      return;
    }
    const win = trade.pnl >= 0;
    const parts: string[] = [`${trade.symbol} ${trade.side.toUpperCase()}`];
    parts.push(`${win ? "+" : ""}$${cash.format(Math.abs(trade.pnl))}`);
    if (trade.resultR) parts.push(`${trade.resultR.toFixed(1)}R`);
    if (trade.setup) parts.push(trade.setup);
    let text = parts.join(" · ");
    if (trade.note && text.length < 220) {
      text += `\n${trade.note.slice(0, 280 - text.length - 1)}`;
    }
    setCaption(text);
    setShared(false);
    setError("");
  }, [trade]);

  const post = async () => {
    if (!trade || !caption.trim() || sharing) return;
    setSharing(true); setError("");
    try {
      await apiRequest("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          content: caption.slice(0, 280),
          symbol: trade.symbol,
          side: trade.side.toUpperCase(),
          result: trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BE",
          pnl: trade.pnl,
          resultR: trade.resultR ?? 0,
          journalEntryId: trade.id,
          chartImageUrls: trade.imageUrls?.length ? trade.imageUrls : undefined,
        }),
      });
      setShared(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Post yuborilmadi.");
    } finally {
      setSharing(false);
    }
  };

  if (!trade) return null;

  const win = trade.pnl >= 0;

  return (
    <Dialog open={Boolean(trade)} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[95dvh] overflow-hidden border border-[#2a2a2a] bg-[#0b0b0b] p-0 shadow-2xl shadow-black/80 sm:max-w-lg"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[#8a8a8a] transition hover:bg-[#2a2a2a] hover:text-white"
          >
            <X size={16} />
          </button>

          <span className="text-sm font-bold text-[#f1f1f1]">Trade ulashish</span>

          {shared ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#2a2a2a] px-4 py-1.5 text-xs font-bold text-[#f1f1f1] transition hover:bg-[#1f1f1f]"
            >
              Yopish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void post()}
              disabled={sharing || !caption.trim()}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-black text-black transition hover:bg-zinc-200 disabled:opacity-40"
            >
              {sharing ? "..." : "🚀 Post"}
            </button>
          )}
        </div>

        {/* ── Body ── */}
        {shared ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <span className="text-5xl">🚀</span>
            <h3 className="text-lg font-bold text-[#f1f1f1]">Post ulashildi!</h3>
            <p className="text-sm text-[#8a8a8a]">TradeWay feedida chiqdi.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-full border border-[#2a2a2a] px-6 py-2 text-sm font-semibold text-[#a1a1aa] transition hover:border-[#3a3a3a] hover:text-[#f1f1f1]"
            >
              Yopish
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto">
            {/* ── Composer ── */}
            <div className="flex gap-3 p-4">
              {/* Avatar */}
              <div className="shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-[11px] font-black uppercase text-zinc-200 ring-1 ring-white/10">
                    {fullName.slice(0, 2)}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="min-w-0 flex-1">
                {/* Username */}
                <p className="mb-1.5 text-sm font-semibold text-[#f1f1f1]">
                  {fullName}
                  <span className="ml-1.5 text-xs font-normal text-[#8a8a8a]">@{username}</span>
                </p>

                {/* Caption textarea */}
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={280}
                  rows={3}
                  placeholder="Trade haqida yozing..."
                  autoFocus
                  className="w-full resize-none bg-transparent text-[15px] leading-6 text-[#f1f1f1] placeholder:text-[#5a5a5a] outline-none"
                />

                {/* ── Trade Card ── */}
                <div
                  className={`mt-3 overflow-hidden rounded-2xl border ${
                    win ? "border-emerald-500/25" : "border-rose-500/25"
                  } bg-[#161616]`}
                >
                  {/* Card header */}
                  <div
                    className={`flex items-center justify-between px-4 py-3 ${
                      win ? "bg-emerald-500/[.06]" : "bg-rose-500/[.06]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-[#f1f1f1]">{trade.symbol}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                          trade.side === "Long"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {trade.side.toUpperCase()}
                      </span>
                      {trade.setup ? (
                        <span className="truncate text-[11px] text-[#8a8a8a]">{trade.setup}</span>
                      ) : null}
                    </div>
                    <span
                      className={`ml-3 shrink-0 font-mono text-base font-black ${
                        win ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {win ? "+" : ""}${cash.format(Math.abs(trade.pnl))}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 border-t border-[#2a2a2a] px-4 py-2">
                    {trade.resultR ? (
                      <span className="font-mono text-[11px] text-[#8a8a8a]">
                        {trade.resultR.toFixed(1)}R
                      </span>
                    ) : null}
                    {trade.session ? (
                      <span className="text-[11px] text-[#8a8a8a]">{trade.session}</span>
                    ) : null}
                    <span className="text-[11px] text-[#8a8a8a]">{trade.date}</span>
                    <span
                      className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-black ${
                        win
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BE"}
                    </span>
                  </div>

                  {/* Images */}
                  {trade.imageUrls?.length ? (
                    <div
                      className={`grid gap-px border-t border-[#2a2a2a] ${
                        trade.imageUrls.length === 1
                          ? "grid-cols-1"
                          : trade.imageUrls.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-3"
                      }`}
                    >
                      {trade.imageUrls.slice(0, 3).map((url, i) => (
                        <div key={i} className="aspect-square overflow-hidden bg-black">
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between border-t border-[#2a2a2a] px-4 py-3">
              <span
                className={`text-[11px] ${
                  caption.length > 250 ? "text-amber-400" : "text-[#8a8a8a]"
                }`}
              >
                {caption.length} / 280
              </span>
              {error ? <span className="text-xs text-rose-400">{error}</span> : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
