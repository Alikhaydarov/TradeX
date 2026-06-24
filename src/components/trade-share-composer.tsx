"use client";

import { Download, LoaderCircle, X } from "lucide-react";
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

/* ─── Canvas helpers ─────────────────────────────────────────────────────────── */

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function makeFeedCard(trade: JournalEntry): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const win = trade.pnl >= 0;
  const accent = win ? "#42d99b" : "#fb7185";
  const date = new Date(`${trade.rawDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const draw = (chart: HTMLImageElement | null) => {
    const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
    bg.addColorStop(0, "#0b0b0b"); bg.addColorStop(0.55, "#171717"); bg.addColorStop(1, "#232323");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1080);

    if (chart) {
      const s = Math.max(1080 / chart.width, 1080 / chart.height);
      ctx.globalAlpha = 0.34;
      ctx.drawImage(chart, (1080 - chart.width * s) / 2, (1080 - chart.height * s) / 2, chart.width * s, chart.height * s);
      ctx.globalAlpha = 1;
    } else {
      [105, 174, 130, 238, 182, 310, 244].forEach((h, i) => {
        const x = 710 + i * 45, y = 620 - h;
        ctx.strokeStyle = "rgba(212,212,216,.22)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + 12, y - 42); ctx.lineTo(x + 12, y + h + 42); ctx.stroke();
        ctx.fillStyle = i % 3 === 0 ? "rgba(66,217,155,.28)" : "rgba(212,212,216,.24)"; ctx.fillRect(x, y, 24, h);
      });
    }

    const shade = ctx.createLinearGradient(0, 0, 1080, 0);
    shade.addColorStop(0, "rgba(11,11,11,.98)"); shade.addColorStop(0.58, "rgba(11,11,11,.9)"); shade.addColorStop(1, "rgba(11,11,11,.2)");
    ctx.fillStyle = shade; ctx.fillRect(0, 0, 1080, 1080);

    ctx.fillStyle = "#fff"; ctx.font = "900 58px Arial,sans-serif"; ctx.fillText("TRADEWAY", 82, 125);
    ctx.fillStyle = "#75819b"; ctx.font = "500 30px Arial,sans-serif"; ctx.fillText(date, 82, 245);
    ctx.fillStyle = "#fff"; ctx.font = "900 72px Arial,sans-serif"; ctx.fillText(trade.symbol, 82, 355);
    ctx.font = "700 38px Arial,sans-serif"; ctx.fillText(trade.side, 82, 440);
    ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fillRect(225, 400, 3, 50);
    ctx.fillStyle = accent; ctx.fillText(trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BE", 260, 440);
    ctx.font = "900 92px Arial,sans-serif"; ctx.fillText(`${(trade.resultR ?? 0).toFixed(2)}R`, 82, 565);
    ctx.font = "800 32px Arial,sans-serif"; ctx.fillText(`${win ? "+" : ""}${cash.format(trade.pnl)}`, 86, 615);
    ctx.fillStyle = "rgba(255,255,255,.13)"; ctx.fillRect(82, 665, 916, 2);

    const m = (lbl: string, val: string, x: number, y: number) => {
      ctx.fillStyle = "#6f7b94"; ctx.font = "600 27px Arial,sans-serif"; ctx.fillText(lbl, x, y);
      ctx.fillStyle = "#fff"; ctx.font = "800 39px Arial,sans-serif"; ctx.fillText(val, x, y + 58);
    };
    m("Entry Price", String(trade.entry), 82, 750); m("Exit Price", String(trade.exit), 570, 750);
    m("Lot Size", String(trade.quantity), 82, 900); m("Risk", trade.riskPercent || cash.format(trade.riskAmount || 0), 330, 900);
    m("Setup", trade.setup || "Unspecified", 570, 900);

    ctx.strokeStyle = accent; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(690, 550); ctx.bezierCurveTo(760, 500, 820, 430, 900, 330); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.moveTo(900, 330); ctx.lineTo(846, 350); ctx.lineTo(884, 392); ctx.closePath(); ctx.fill();

    return canvas.toDataURL("image/png", 1);
  };

  if (trade.imageUrls?.[0]) {
    const img = await loadImg(trade.imageUrls[0]);
    try { return draw(img); } catch { return draw(null); }
  }
  return draw(null);
}

async function makeStoryCard(trade: JournalEntry): Promise<string> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const win = trade.pnl >= 0;
  const accent = win ? "#42d99b" : "#fb7185";
  const date = new Date(`${trade.rawDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const draw = (chart: HTMLImageElement | null) => {
    /* background */
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#080808"); bg.addColorStop(0.5, "#111"); bg.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    /* ghost chart texture */
    if (chart) {
      const s = Math.max(W / chart.width, (H * 0.55) / chart.height);
      ctx.globalAlpha = 0.18;
      ctx.drawImage(chart, (W - chart.width * s) / 2, 0, chart.width * s, chart.height * s);
      ctx.globalAlpha = 1;
    } else {
      [130, 210, 160, 290, 220, 370, 280, 190].forEach((h, i) => {
        const x = 560 + i * 68, y = 700 - h;
        ctx.strokeStyle = "rgba(212,212,216,.12)"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x + 15, y - 55); ctx.lineTo(x + 15, y + h + 55); ctx.stroke();
        ctx.fillStyle = i % 3 === 0 ? "rgba(66,217,155,.16)" : "rgba(212,212,216,.14)"; ctx.fillRect(x, y, 30, h);
      });
    }

    /* top vignette */
    const vig = ctx.createLinearGradient(0, 0, 0, H * 0.58);
    vig.addColorStop(0, "rgba(8,8,8,1)"); vig.addColorStop(0.55, "rgba(8,8,8,.85)"); vig.addColorStop(1, "rgba(8,8,8,0)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H * 0.58);

    /* TRADEWAY */
    ctx.fillStyle = "#fff"; ctx.font = "900 58px Arial,sans-serif"; ctx.fillText("TRADEWAY", 80, 148);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(80 + ctx.measureText("TRADEWAY").width + 20, 126, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5a6476"; ctx.font = "500 29px Arial,sans-serif"; ctx.fillText(date, 80, 210);

    /* symbol */
    ctx.fillStyle = "#fff"; ctx.font = "900 112px Arial,sans-serif"; ctx.fillText(trade.symbol, 80, 380);

    /* chips */
    const chipDraw = (label: string, x: number, bg2: string, fg: string) => {
      ctx.font = "800 25px Arial,sans-serif";
      const tw = ctx.measureText(label).width + 44;
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.roundRect(x, 410, tw, 54, 14); ctx.fill();
      ctx.fillStyle = fg; ctx.fillText(label, x + 22, 445);
      return tw + 16;
    };
    const sBg = trade.side === "Long" ? "rgba(66,217,155,.18)" : "rgba(251,113,133,.18)";
    const sFg = trade.side === "Long" ? "#42d99b" : "#fb7185";
    const rBg = win ? "rgba(66,217,155,.18)" : "rgba(251,113,133,.18)";
    const rFg = win ? "#42d99b" : "#fb7185";
    const cw = chipDraw(trade.side.toUpperCase(), 80, sBg, sFg);
    chipDraw(trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BE", 80 + cw, rBg, rFg);

    /* P&L */
    const pnlFont = Math.abs(trade.pnl) >= 10000 ? 100 : 122;
    ctx.fillStyle = accent; ctx.font = `900 ${pnlFont}px Arial,sans-serif`;
    ctx.fillText(`${win ? "+" : ""}${cash.format(trade.pnl)}`, 80, 628);

    /* R */
    if (trade.resultR) {
      ctx.font = "800 54px Arial,sans-serif"; ctx.globalAlpha = 0.72;
      ctx.fillText(`${trade.resultR.toFixed(2)}R`, 80, 712);
      ctx.globalAlpha = 1;
    }

    /* divider */
    ctx.fillStyle = "rgba(255,255,255,.09)"; ctx.fillRect(80, 762, W - 160, 2);

    /* stats */
    const stat = (lbl: string, val: string, x: number, y: number) => {
      ctx.fillStyle = "#4a5568"; ctx.font = "600 27px Arial,sans-serif"; ctx.fillText(lbl, x, y);
      ctx.fillStyle = "#dde2ed"; ctx.font = "700 38px Arial,sans-serif"; ctx.fillText(val, x, y + 52);
    };
    stat("ENTRY", String(trade.entry), 80, 810);  stat("EXIT", String(trade.exit), 580, 810);
    stat("LOT SIZE", String(trade.quantity), 80, 930); stat("RISK", trade.riskPercent || cash.format(trade.riskAmount || 0), 580, 930);
    if (trade.setup)   stat("SETUP",   trade.setup,   80,  1050);
    if (trade.session) stat("SESSION", trade.session, 580, 1050);

    /* clear chart */
    const czY = 1170, czH = 570;
    if (chart) {
      const s = Math.min((W - 100) / chart.width, czH / chart.height);
      const cw2 = chart.width * s, ch2 = chart.height * s;
      const cx2 = (W - cw2) / 2;
      ctx.fillStyle = "rgba(255,255,255,.04)";
      ctx.beginPath(); ctx.roundRect(cx2 - 18, czY - 18, cw2 + 36, ch2 + 36, 22); ctx.fill();
      ctx.drawImage(chart, cx2, czY, cw2, ch2);
      ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cx2 - 18, czY - 18, cw2 + 36, ch2 + 36, 22); ctx.stroke();
    }

    /* bottom fade */
    const btm = ctx.createLinearGradient(0, H * 0.88, 0, H);
    btm.addColorStop(0, "rgba(8,8,8,0)"); btm.addColorStop(1, "rgba(8,8,8,.96)");
    ctx.fillStyle = btm; ctx.fillRect(0, H * 0.88, W, H * 0.12);

    /* footer */
    ctx.textAlign = "center";
    ctx.fillStyle = "#3a4050"; ctx.font = "600 28px Arial,sans-serif"; ctx.fillText("tradeway.app", W / 2, H - 90);
    ctx.font = "500 23px Arial,sans-serif"; ctx.fillText("Track. Trade. Grow.", W / 2, H - 48);
    ctx.textAlign = "left";

    return canvas.toDataURL("image/png", 1);
  };

  if (trade.imageUrls?.[0]) {
    const img = await loadImg(trade.imageUrls[0]);
    try { return draw(img); } catch { return draw(null); }
  }
  return draw(null);
}

async function uploadDataUrl(dataUrl: string, filename: string): Promise<string> {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  const form = new FormData();
  form.append("image", new File([blob], filename, { type: "image/png" }));
  const res = await fetch("/api/posts/image", { method: "POST", credentials: "same-origin", body: form });
  const json = (await res.json()) as { imageUrl?: string; error?: string };
  if (!res.ok || !json.imageUrl) throw new Error(json.error ?? "Image upload failed");
  return json.imageUrl;
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

export function TradeShareComposer({ trade, onClose }: TradeShareComposerProps) {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [feedCardUrl, setFeedCardUrl] = useState("");
  const [storyCardUrl, setStoryCardUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"feed" | "story">("feed");

  const username = String(user?.user_metadata?.user_name ?? user?.email?.split("@")[0] ?? "you");
  const fullName = String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? username);
  const avatarUrl = typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  /* generate images when trade changes */
  useEffect(() => {
    if (!trade) {
      setCaption(""); setFeedCardUrl(""); setStoryCardUrl(""); setShared(false); setError(""); return;
    }
    const win = trade.pnl >= 0;
    const parts = [`${trade.symbol} ${trade.side.toUpperCase()}`, `${win ? "+" : ""}$${cash.format(Math.abs(trade.pnl))}`];
    if (trade.resultR) parts.push(`${trade.resultR.toFixed(1)}R`);
    if (trade.setup) parts.push(trade.setup);
    let text = parts.join(" · ");
    if (trade.note && text.length < 220) text += `\n${trade.note.slice(0, 280 - text.length - 1)}`;
    setCaption(text);
    setShared(false); setError(""); setActiveTab("feed");

    setGenerating(true);
    setFeedCardUrl(""); setStoryCardUrl("");
    Promise.all([makeFeedCard(trade), makeStoryCard(trade)]).then(([feed, story]) => {
      setFeedCardUrl(feed); setStoryCardUrl(story); setGenerating(false);
    }).catch(() => setGenerating(false));
  }, [trade]);

  const post = async () => {
    if (!trade || !caption.trim() || sharing) return;
    setSharing(true); setError("");
    try {
      let shareImageUrl: string | undefined;
      if (feedCardUrl) {
        try { shareImageUrl = await uploadDataUrl(feedCardUrl, `${trade.symbol}-${trade.rawDate}-tradeway.png`); }
        catch { /* post without card if upload fails */ }
      }
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
          shareImageUrl,
        }),
      });
      setShared(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Post yuborilmadi.");
    } finally {
      setSharing(false);
    }
  };

  const downloadStory = () => {
    if (!storyCardUrl) return;
    const a = document.createElement("a");
    a.href = storyCardUrl;
    a.download = `${trade?.symbol ?? "trade"}-${trade?.rawDate ?? "story"}-story.png`;
    a.click();
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
          <button type="button" onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[#8a8a8a] transition hover:bg-[#2a2a2a] hover:text-white">
            <X size={16} />
          </button>
          <span className="text-sm font-bold text-[#f1f1f1]">Trade ulashish</span>
          {shared ? (
            <button type="button" onClick={onClose}
              className="rounded-full border border-[#2a2a2a] px-4 py-1.5 text-xs font-bold text-[#f1f1f1] transition hover:bg-[#1f1f1f]">
              Yopish
            </button>
          ) : (
            <button type="button" onClick={() => void post()}
              disabled={sharing || !caption.trim()}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-black text-black transition hover:bg-zinc-200 disabled:opacity-40">
              {sharing ? "..." : "🚀 Post"}
            </button>
          )}
        </div>

        {/* ── Body ── */}
        {shared ? (
          <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <span className="text-5xl">🚀</span>
            <h3 className="text-lg font-bold text-[#f1f1f1]">Post ulashildi!</h3>
            <p className="text-sm text-[#8a8a8a]">TradeWay feedida chiqdi.</p>
            {storyCardUrl && (
              <button type="button" onClick={downloadStory}
                className="mt-2 flex items-center gap-2 rounded-full border border-[#2a2a2a] px-5 py-2.5 text-sm font-semibold text-[#f1f1f1] transition hover:bg-[#1a1a1a]">
                <Download size={15} /> Instagram Story yuklab olish
              </button>
            )}
            <button type="button" onClick={onClose}
              className="mt-1 text-sm text-[#8a8a8a] transition hover:text-[#f1f1f1]">
              Yopish
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto">
            {/* Composer row */}
            <div className="flex gap-3 p-4">
              <div className="shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-[11px] font-black uppercase text-zinc-200 ring-1 ring-white/10">
                    {fullName.slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-sm font-semibold text-[#f1f1f1]">
                  {fullName}<span className="ml-1.5 text-xs font-normal text-[#8a8a8a]">@{username}</span>
                </p>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={280} rows={3}
                  placeholder="Trade haqida yozing..." autoFocus
                  className="w-full resize-none bg-transparent text-[15px] leading-6 text-[#f1f1f1] placeholder:text-[#5a5a5a] outline-none" />

                {/* ── Trade card preview ── */}
                <div className={`mt-3 overflow-hidden rounded-2xl border ${win ? "border-emerald-500/25" : "border-rose-500/25"} bg-[#161616]`}>
                  <div className={`flex items-center justify-between px-4 py-3 ${win ? "bg-emerald-500/[.06]" : "bg-rose-500/[.06]"}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-sm font-bold text-[#f1f1f1]">{trade.symbol}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${trade.side === "Long" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                        {trade.side.toUpperCase()}
                      </span>
                      {trade.setup ? <span className="truncate text-[11px] text-[#8a8a8a]">{trade.setup}</span> : null}
                    </div>
                    <span className={`ml-3 shrink-0 font-mono text-base font-black ${win ? "text-emerald-400" : "text-rose-400"}`}>
                      {win ? "+" : ""}${cash.format(Math.abs(trade.pnl))}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 border-t border-[#2a2a2a] px-4 py-2">
                    {trade.resultR ? <span className="font-mono text-[11px] text-[#8a8a8a]">{trade.resultR.toFixed(1)}R</span> : null}
                    {trade.session ? <span className="text-[11px] text-[#8a8a8a]">{trade.session}</span> : null}
                    <span className="text-[11px] text-[#8a8a8a]">{trade.date}</span>
                    <span className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-black ${win ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                      {trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BE"}
                    </span>
                  </div>
                  {trade.imageUrls?.length ? (
                    <div className={`grid gap-px border-t border-[#2a2a2a] ${trade.imageUrls.length === 1 ? "" : trade.imageUrls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      {trade.imageUrls.slice(0, 3).map((url, i) => (
                        <div key={i} className="aspect-square overflow-hidden bg-black">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* ── Image previews (Feed card | Story) ── */}
            <div className="border-t border-[#1f1f1f] px-4 pb-0 pt-3">
              {/* Tabs */}
              <div className="mb-3 flex gap-1">
                {(["feed", "story"] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeTab === tab ? "bg-white/10 text-[#f1f1f1]" : "text-[#8a8a8a] hover:text-[#c1c1c1]"}`}>
                    {tab === "feed" ? "📸 Feed card" : "📱 IG Story"}
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className={`relative mx-auto overflow-hidden rounded-xl bg-[#111] ${activeTab === "story" ? "aspect-[9/16] max-w-[180px]" : "aspect-square max-w-[280px]"}`}>
                {generating ? (
                  <div className="grid h-full place-items-center">
                    <LoaderCircle size={22} className="animate-spin text-zinc-500" />
                  </div>
                ) : (
                  <img
                    src={activeTab === "feed" ? feedCardUrl : storyCardUrl}
                    alt={activeTab === "feed" ? "Feed card" : "IG Story"}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              {/* Story download button */}
              {activeTab === "story" && storyCardUrl && (
                <div className="mt-3 flex justify-center">
                  <button type="button" onClick={downloadStory}
                    className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] px-4 py-2 text-xs font-semibold text-[#a1a1aa] transition hover:border-[#3a3a3a] hover:text-[#f1f1f1]">
                    <Download size={13} /> Story yuklab olish (.png)
                  </button>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className={`text-[11px] ${caption.length > 250 ? "text-amber-400" : "text-[#8a8a8a]"}`}>
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
