"use client";

import { Download, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";
import { MediaImage } from "./media-image";
import { Dialog, DialogContent } from "./ui/dialog";
import type { JournalEntry } from "./types";

interface TradeShareComposerProps {
  trade: JournalEntry | null;
  onClose: () => void;
}

const cash = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── Canvas helpers ──────────────────────────────────────────────────────── */

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Round-rect polyfill for older browsers */
function rRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Small deterministic PRNG so the same trade always gets the same decorative candle pattern. */
function seededRandom(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Faint procedural candlestick strip drawn when a trade has no attached chart screenshot, so the card never looks empty. */
function drawGhostCandles(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, accent: string, win: boolean, seedStr: string) {
  const rnd = seededRandom(seedStr);
  const count = Math.max(8, Math.round(w / 46));
  const colW = w / count;
  let level = h * (win ? 0.72 : 0.28);
  const bias = win ? -1 : 1;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const drift = (rnd() - 0.42) * h * 0.12 + bias * h * 0.018;
    const open = level;
    const close = Math.min(h * 0.94, Math.max(h * 0.06, level + drift));
    const wick = rnd() * h * 0.05;
    const top = Math.min(open, close) - wick;
    const bottom = Math.max(open, close) + wick;
    const cx = x + i * colW + colW * 0.5;
    const bodyTop = y + Math.min(open, close);
    const bodyH = Math.max(4, Math.abs(close - open));
    const up = close < open;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, y + top); ctx.lineTo(cx, y + bottom); ctx.stroke();
    ctx.fillStyle = up ? `${accent}26` : "rgba(255,255,255,0.07)";
    rRect(ctx, cx - colW * 0.24, bodyTop, colW * 0.48, bodyH, 2);
    ctx.fill();
    level = close;
  }
  ctx.restore();
}

/* ── FEED CARD  1080 × 1080 ────────────────────────────────────────────────── */
async function makeFeedCard(trade: JournalEntry): Promise<string> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const win     = trade.pnl >= 0;
  const accent  = win ? "#34d399" : "#f87171";
  const dateStr = new Date(`${trade.rawDate}T00:00:00`).toLocaleDateString("en-US",
    { month: "short", day: "numeric", year: "numeric" });

  const draw = (chart: HTMLImageElement | null) => {
    /* 1 — dark background */
    const bg = ctx.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, "#0a0a0a"); bg.addColorStop(1, "#1c1c1c");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);

    /* 2 — blurred chart ghost (right side) */
    if (chart) {
      ctx.save();
      const scale = Math.max(S / chart.width, S / chart.height);
      const cw = chart.width * scale, ch = chart.height * scale;
      ctx.globalAlpha = 0.22;
      ctx.drawImage(chart, (S - cw) / 2, (S - ch) / 2, cw, ch);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    /* 3 — left-to-right dark fade so text stays readable */
    const shade = ctx.createLinearGradient(0, 0, S, 0);
    shade.addColorStop(0,    "rgba(10,10,10,1)");
    shade.addColorStop(0.52, "rgba(10,10,10,0.92)");
    shade.addColorStop(0.78, "rgba(10,10,10,0.60)");
    shade.addColorStop(1,    "rgba(10,10,10,0.10)");
    ctx.fillStyle = shade; ctx.fillRect(0, 0, S, S);

    /* 4 — accent left border strip */
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 6, S);

    /* ── TEXT ── */
    const X = 72; // left margin

    /* TRADEWAY logo */
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 50px 'Arial Black', Arial, sans-serif";
    ctx.fillText("TRADEWAY", X, 108);

    /* date — top right */
    ctx.fillStyle = "#6b7280";
    ctx.font = "500 26px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(dateStr, S - 56, 96);
    ctx.textAlign = "left";

    /* Symbol */
    ctx.fillStyle = "#f9fafb";
    ctx.font = "900 100px 'Arial Black', Arial, sans-serif";
    ctx.fillText(trade.symbol, X, 268);

    /* Side + Result chips */
    const drawChip = (label: string, x: number, y: number, bg2: string, fg: string) => {
      ctx.font = "800 26px Arial, sans-serif";
      const tw = ctx.measureText(label).width;
      const pw = tw + 36, ph = 48, r = 12;
      ctx.fillStyle = bg2; rRect(ctx, x, y, pw, ph, r); ctx.fill();
      ctx.fillStyle = fg; ctx.fillText(label, x + 18, y + 33);
      return pw + 14;
    };

    const sideColor  = trade.side === "Long" ? ["rgba(52,211,153,.2)", "#34d399"] : ["rgba(248,113,113,.2)", "#f87171"];
    const resultLabel = trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BREAKEVEN";
    const resultColor = win ? ["rgba(52,211,153,.2)", "#34d399"] : ["rgba(248,113,113,.2)", "#f87171"];

    let cx = X;
    cx += drawChip(trade.side.toUpperCase(), cx, 304, sideColor[0], sideColor[1]);
    drawChip(resultLabel, cx, 304, resultColor[0], resultColor[1]);

    /* P&L — big */
    const pnlStr = `${win ? "+" : ""}$${cash.format(Math.abs(trade.pnl))}`;
    const pnlSize = pnlStr.length > 12 ? 82 : pnlStr.length > 9 ? 92 : 104;
    ctx.fillStyle = accent;
    ctx.font = `900 ${pnlSize}px 'Arial Black', Arial, sans-serif`;
    ctx.fillText(pnlStr, X, 460);

    /* R value (only if valid) */
    let nextY = 510;
    if (trade.resultR && Math.abs(trade.resultR) > 0.01) {
      ctx.fillStyle = accent; ctx.globalAlpha = 0.7;
      ctx.font = "700 44px Arial, sans-serif";
      ctx.fillText(`${trade.resultR.toFixed(2)}R`, X, 525);
      ctx.globalAlpha = 1;
      nextY = 560;
    }

    /* divider */
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(X, nextY + 10, 560, 1.5);

    /* optional tags (setup / session) — internal auto-sync labels are never shown publicly */
    const isInternalLabel = (val: string) => /auto\s*sync/i.test(val);
    let tagX = X;
    const drawTag = (val: string, x: number, y: number) => {
      ctx.font = "600 25px Arial, sans-serif";
      const tw = ctx.measureText(val).width;
      ctx.fillStyle = "rgba(255,255,255,0.07)"; rRect(ctx, x, y, tw + 28, 42, 10); ctx.fill();
      ctx.fillStyle = "#9ca3af"; ctx.fillText(val, x + 14, y + 29);
      return tw + 44;
    };
    const tagY = nextY + 36;
    const setupTag = trade.setup?.trim();
    const sessionTag = trade.session?.trim();
    if (setupTag && !isInternalLabel(setupTag))     tagX += drawTag(setupTag, tagX, tagY);
    if (sessionTag && !isInternalLabel(sessionTag)) drawTag(sessionTag, tagX, tagY);

    /* trend arrow (top-right) — direction and color always match the actual outcome */
    if (chart) {
      ctx.strokeStyle = accent; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      if (win) { ctx.moveTo(660, 520); ctx.bezierCurveTo(760, 440, 840, 360, 950, 270); }
      else { ctx.moveTo(660, 270); ctx.bezierCurveTo(760, 350, 840, 430, 950, 520); }
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      if (win) { ctx.moveTo(950, 270); ctx.lineTo(900, 295); ctx.lineTo(936, 335); }
      else { ctx.moveTo(950, 520); ctx.lineTo(936, 465); ctx.lineTo(900, 495); }
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      /* no chart image — fill the empty right side with a subtle procedural candle backdrop instead of blank space */
      drawGhostCandles(ctx, 640, 150, S - 640 - 56, 460, accent, win, `${trade.id}-feed`);
    }

    /* bottom: tiny tradeway.app */
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "500 22px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("tradeway.app", S / 2, S - 36);
    ctx.textAlign = "left";

    return canvas.toDataURL("image/png", 1);
  };

  if (trade.imageUrls?.[0]) {
    const img = await loadImg(trade.imageUrls[0]);
    try { return draw(img); } catch { return draw(null); }
  }
  return draw(null);
}

/* ── STORY CARD  1080 × 1920 ──────────────────────────────────────────────── */
async function makeStoryCard(trade: JournalEntry): Promise<string> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const win     = trade.pnl >= 0;
  const accent  = win ? "#34d399" : "#f87171";
  const dateStr = new Date(`${trade.rawDate}T00:00:00`).toLocaleDateString("en-US",
    { month: "short", day: "numeric", year: "numeric" });

  const draw = (chart: HTMLImageElement | null) => {
    /* background */
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#060606"); bg.addColorStop(0.6, "#101010"); bg.addColorStop(1, "#181818");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    /* accent strip */
    ctx.fillStyle = accent; ctx.fillRect(0, 0, 6, H);

    /* ghost chart background (upper half) */
    if (chart) {
      const scale = Math.max(W / chart.width, (H * 0.52) / chart.height);
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.drawImage(chart, (W - chart.width * scale) / 2, 0, chart.width * scale, chart.height * scale);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    /* top vignette — keeps text readable */
    const vig = ctx.createLinearGradient(0, 0, 0, H * 0.56);
    vig.addColorStop(0, "rgba(6,6,6,1)");
    vig.addColorStop(0.6, "rgba(6,6,6,0.88)");
    vig.addColorStop(1,   "rgba(6,6,6,0)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H * 0.56);

    const X = 80;

    /* TRADEWAY */
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 54px 'Arial Black', Arial, sans-serif";
    ctx.fillText("TRADEWAY", X, 148);
    /* accent dot */
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(X + ctx.measureText("TRADEWAY").width + 20, 128, 10, 0, Math.PI * 2);
    ctx.fill();

    /* date */
    ctx.fillStyle = "#6b7280";
    ctx.font = "500 28px Arial, sans-serif";
    ctx.fillText(dateStr, X, 206);

    /* symbol */
    ctx.fillStyle = "#f9fafb";
    ctx.font = "900 118px 'Arial Black', Arial, sans-serif";
    ctx.fillText(trade.symbol, X, 378);

    /* chips */
    const chip = (label: string, x: number, y: number, bg2: string, fg: string) => {
      ctx.font = "800 27px Arial, sans-serif";
      const tw = ctx.measureText(label).width + 44;
      ctx.fillStyle = bg2; rRect(ctx, x, y, tw, 54, 14); ctx.fill();
      ctx.fillStyle = fg; ctx.fillText(label, x + 22, y + 37);
      return tw + 16;
    };
    const sBg = trade.side === "Long" ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)";
    const sFg = trade.side === "Long" ? "#34d399" : "#f87171";
    const rLabel = trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BE";
    const rBg = win ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)";
    const cw2 = chip(trade.side.toUpperCase(), X, 414, sBg, sFg);
    chip(rLabel, X + cw2, 414, rBg, win ? "#34d399" : "#f87171");

    /* P&L */
    const pnlStr = `${win ? "+" : ""}$${cash.format(Math.abs(trade.pnl))}`;
    const pnlSize = pnlStr.length > 12 ? 92 : pnlStr.length > 9 ? 108 : 126;
    ctx.fillStyle = accent;
    ctx.font = `900 ${pnlSize}px 'Arial Black', Arial, sans-serif`;
    ctx.fillText(pnlStr, X, 604);

    /* R value */
    let statsY = 680;
    if (trade.resultR && Math.abs(trade.resultR) > 0.01) {
      ctx.fillStyle = accent; ctx.globalAlpha = 0.72;
      ctx.font = "700 56px Arial, sans-serif";
      ctx.fillText(`${trade.resultR.toFixed(2)}R`, X, 682);
      ctx.globalAlpha = 1;
      statsY = 750;
    }

    /* divider */
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    ctx.fillRect(X, statsY + 6, W - X * 2, 1.5);

    /* optional tags — internal auto-sync labels are never shown publicly */
    const isInternalLabel = (val: string) => /auto\s*sync/i.test(val);
    let tagX = X;
    const tag = (val: string, x: number, y: number) => {
      ctx.font = "600 27px Arial, sans-serif";
      const tw = ctx.measureText(val).width + 32;
      ctx.fillStyle = "rgba(255,255,255,0.07)"; rRect(ctx, x, y, tw, 46, 12); ctx.fill();
      ctx.fillStyle = "#9ca3af"; ctx.fillText(val, x + 16, y + 32);
      return tw + 16;
    };
    const tagY2 = statsY + 36;
    const setupTag2 = trade.setup?.trim();
    const sessionTag2 = trade.session?.trim();
    if (setupTag2 && !isInternalLabel(setupTag2))     tagX += tag(setupTag2, tagX, tagY2);
    if (sessionTag2 && !isInternalLabel(sessionTag2)) tag(sessionTag2, tagX, tagY2);

    /* ── Clear chart image (lower section) ── */
    const chartZoneTop = 920, chartZoneH = 760;
    if (chart) {
      const scale = Math.min((W - 100) / chart.width, chartZoneH / chart.height);
      const cw3 = chart.width * scale, ch3 = chart.height * scale;
      const cx3 = (W - cw3) / 2, cy3 = chartZoneTop + (chartZoneH - ch3) / 2;

      /* card bg */
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      rRect(ctx, cx3 - 18, cy3 - 18, cw3 + 36, ch3 + 36, 20); ctx.fill();
      ctx.drawImage(chart, cx3, cy3, cw3, ch3);
      ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 2;
      rRect(ctx, cx3 - 18, cy3 - 18, cw3 + 36, ch3 + 36, 20); ctx.stroke();
    } else {
      /* no chart image — subtle procedural candle backdrop, colored to match the actual outcome */
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      rRect(ctx, X, chartZoneTop, W - X * 2, chartZoneH, 20); ctx.fill();
      drawGhostCandles(ctx, X + 40, chartZoneTop + 40, W - X * 2 - 80, chartZoneH - 80, accent, win, `${trade.id}-story`);
    }

    /* bottom gradient overlay */
    const btm = ctx.createLinearGradient(0, H * 0.87, 0, H);
    btm.addColorStop(0, "rgba(6,6,6,0)"); btm.addColorStop(1, "rgba(6,6,6,0.96)");
    ctx.fillStyle = btm; ctx.fillRect(0, H * 0.87, W, H * 0.13);

    /* footer */
    ctx.textAlign = "center";
    ctx.fillStyle = "#374151";
    ctx.font = "600 28px Arial, sans-serif";
    ctx.fillText("tradeway.app", W / 2, H - 88);
    ctx.font = "500 22px Arial, sans-serif";
    ctx.fillText("Track. Trade. Grow.", W / 2, H - 50);
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

/* ─── Component ───────────────────────────────────────────────────────────── */

export function TradeShareComposer({ trade, onClose }: TradeShareComposerProps) {
  const { user } = useAuth();
  const [caption, setCaption]       = useState("");
  const [feedCardUrl, setFeedCardUrl] = useState("");
  const [storyCardUrl, setStoryCardUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing]       = useState(false);
  const [shared, setShared]         = useState(false);
  const [error, setError]           = useState("");
  const [activeTab, setActiveTab]   = useState<"feed" | "story">("feed");

  const username  = String(user?.user_metadata?.user_name ?? user?.email?.split("@")[0] ?? "you");
  const fullName  = String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? username);
  const avatarUrl = typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  useEffect(() => {
    if (!trade) {
      setCaption(""); setFeedCardUrl(""); setStoryCardUrl(""); setShared(false); setError(""); return;
    }
    const win = trade.pnl >= 0;
    const parts = [
      `${trade.symbol} ${trade.side.toUpperCase()}`,
      `${win ? "+" : ""}$${cash.format(Math.abs(trade.pnl))}`,
    ];
    if (trade.resultR && Math.abs(trade.resultR) > 0.01) parts.push(`${trade.resultR.toFixed(2)}R`);
    if (trade.setup?.trim()) parts.push(trade.setup.trim());
    let text = parts.join(" · ");
    if (trade.note?.trim() && text.length < 220) text += `\n${trade.note.trim().slice(0, 280 - text.length - 1)}`;
    setCaption(text);
    setShared(false); setError(""); setActiveTab("feed");

    setGenerating(true); setFeedCardUrl(""); setStoryCardUrl("");
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
        try {
          shareImageUrl = await uploadDataUrl(
            feedCardUrl,
            `${trade.symbol}-${trade.rawDate}-tradeway.png`,
          );
        } catch { /* post without card if upload fails */ }
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
    if (!storyCardUrl || !trade) return;
    const a = document.createElement("a");
    a.href = storyCardUrl;
    a.download = `${trade.symbol}-${trade.rawDate}-story.png`;
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
        {/* Header */}
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

        {/* Body */}
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
            {/* Composer */}
            <div className="flex gap-3 p-4">
              <div className="shrink-0">
                {avatarUrl ? (
                  <MediaImage src={avatarUrl} alt={fullName} className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-[11px] font-black uppercase text-zinc-200 ring-1 ring-white/10">
                    {fullName.slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-sm font-semibold text-[#f1f1f1]">
                  {fullName}
                  <span className="ml-1.5 text-xs font-normal text-[#8a8a8a]">@{username}</span>
                </p>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                  maxLength={280} rows={3} placeholder="Trade haqida yozing..." autoFocus
                  className="w-full resize-none bg-transparent text-[15px] leading-6 text-[#f1f1f1] placeholder:text-[#5a5a5a] outline-none" />

                {/* Trade preview card */}
                <div className={`mt-3 overflow-hidden rounded-2xl border ${win ? "border-emerald-500/25" : "border-rose-500/25"} bg-[#161616]`}>
                  <div className={`flex items-center justify-between px-4 py-3 ${win ? "bg-emerald-500/[.06]" : "bg-rose-500/[.06]"}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-sm font-bold text-[#f1f1f1]">{trade.symbol}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${trade.side === "Long" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                        {trade.side.toUpperCase()}
                      </span>
                      {trade.setup?.trim() ? <span className="truncate text-[11px] text-[#8a8a8a]">{trade.setup}</span> : null}
                    </div>
                    <span className={`ml-3 shrink-0 font-mono text-base font-black ${win ? "text-emerald-400" : "text-rose-400"}`}>
                      {win ? "+" : ""}${cash.format(Math.abs(trade.pnl))}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 border-t border-[#2a2a2a] px-4 py-2">
                    {trade.resultR && Math.abs(trade.resultR) > 0.01
                      ? <span className="font-mono text-[11px] text-[#8a8a8a]">{trade.resultR.toFixed(2)}R</span>
                      : null}
                    {trade.session?.trim() ? <span className="text-[11px] text-[#8a8a8a]">{trade.session}</span> : null}
                    <span className="text-[11px] text-[#8a8a8a]">{trade.date}</span>
                    <span className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-black ${win ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                      {trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BE"}
                    </span>
                  </div>
                  {trade.imageUrls?.length ? (
                    <div className={`grid gap-px border-t border-[#2a2a2a] ${trade.imageUrls.length === 1 ? "" : trade.imageUrls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      {trade.imageUrls.slice(0, 3).map((url, i) => (
                        <div key={i} className="aspect-square overflow-hidden bg-black">
                          <MediaImage src={url} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Image preview tabs */}
            <div className="border-t border-[#1a1a1a] px-4 pb-2 pt-3">
              <div className="mb-3 flex gap-1">
                {(["feed", "story"] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeTab === tab ? "bg-white/10 text-[#f1f1f1]" : "text-[#8a8a8a] hover:text-[#c1c1c1]"}`}>
                    {tab === "feed" ? "📸 Feed card" : "📱 IG Story"}
                  </button>
                ))}
              </div>

              <div className={`relative mx-auto overflow-hidden rounded-xl bg-[#111] ${activeTab === "story" ? "aspect-[9/16] max-w-[164px]" : "aspect-square max-w-[260px]"}`}>
                {generating ? (
                  <div className="grid h-full place-items-center">
                    <LoaderCircle size={22} className="animate-spin text-zinc-600" />
                  </div>
                ) : (
                  <MediaImage src={activeTab === "feed" ? feedCardUrl : storyCardUrl}
                    alt={activeTab === "feed" ? "Feed card preview" : "IG Story preview"}
                    className="h-full w-full object-cover" />
                )}
              </div>

              {activeTab === "story" && storyCardUrl && (
                <div className="mt-3 flex justify-center">
                  <button type="button" onClick={downloadStory}
                    className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] px-4 py-2 text-xs font-semibold text-[#a1a1aa] transition hover:border-[#3a3a3a] hover:text-[#f1f1f1]">
                    <Download size={13} /> Story yuklab olish (.png)
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
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
