"use client";

import { Download, LoaderCircle, Share2, X } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";
import { MediaImage } from "./media-image";
import { Dialog, DialogContent } from "./ui/dialog";
import type { JournalEntry } from "./types";
import { drawTradoxyMark } from "@/lib/tradoxy-mark";

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


/* ── SHARE THEMES ──────────────────────────────────────────────────────────
 * Two tiers, matching how traders actually pick: a flat colour wash, or a
 * neon-framed "premium" card.
 *
 * The theme drives the card's background and frame only. Profit stays green
 * and loss stays red regardless of theme - a losing trade on the gold card
 * still has to read as a loss, or the card is dishonest.
 */
/** Who the card says took the trade. */
export type CardAuthor = { name: string; handle: string };

export type ShareTheme = {
  id: string;
  label: string;
  tier: "color" | "premium";
  /** background gradient stops, top-left to bottom-right */
  from: string;
  mid?: string;
  to: string;
  /** neon frame colour; premium tier only */
  glow?: string;
};

export const SHARE_THEMES: ShareTheme[] = [
  { id: "onyx",     label: "Onyx",     tier: "color", from: "#0a0a0a", to: "#1c1c1c" },
  { id: "midnight", label: "Midnight", tier: "color", from: "#08131f", mid: "#0e2337", to: "#16354f" },
  { id: "ember",    label: "Ember",    tier: "color", from: "#1b0d05", mid: "#3a1a0a", to: "#5a2a10" },
  { id: "plum",     label: "Plum",     tier: "color", from: "#140a20", mid: "#241238", to: "#3a1d58" },
  { id: "crimson",  label: "Crimson",  tier: "color", from: "#1c0709", mid: "#360d14", to: "#54141f" },
  { id: "sand",     label: "Sand",     tier: "color", from: "#1c1710", mid: "#3a2f22", to: "#5d4b35" },

  { id: "azure",    label: "Azure",    tier: "premium", from: "#050a12", to: "#0a1622", glow: "#38bdf8" },
  { id: "magenta",  label: "Magenta",  tier: "premium", from: "#0f050f", to: "#1b0a1b", glow: "#e879f9" },
  { id: "violet",   label: "Violet",   tier: "premium", from: "#0a0714", to: "#140d24", glow: "#a78bfa" },
  { id: "emerald",  label: "Emerald",  tier: "premium", from: "#04100b", to: "#081d14", glow: "#34d399" },
  { id: "ruby",     label: "Ruby",     tier: "premium", from: "#120507", to: "#1f0a0e", glow: "#fb7185" },
  { id: "amber",    label: "Amber",    tier: "premium", from: "#120c02", to: "#1f1605", glow: "#fbbf24" },
];

export const DEFAULT_THEME = SHARE_THEMES[0];

/** CSS preview for a theme swatch in the picker. */
export function themeSwatchStyle(theme: ShareTheme) {
  const stops = [theme.from, theme.mid, theme.to].filter(Boolean).join(", ");
  return theme.glow
    ? {
        backgroundImage: `linear-gradient(135deg, ${stops})`,
        boxShadow: `inset 0 0 0 2px ${theme.glow}, 0 0 12px -1px ${theme.glow}`,
      }
    : { backgroundImage: `linear-gradient(135deg, ${stops})` };
}

/** Paints the theme background across an arbitrary canvas box. */
function paintThemeBackground(
  ctx: CanvasRenderingContext2D,
  theme: ShareTheme,
  w: number,
  h: number,
  diagonal: boolean,
) {
  const bg = diagonal
    ? ctx.createLinearGradient(0, 0, w, h)
    : ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, theme.from);
  if (theme.mid) bg.addColorStop(0.55, theme.mid);
  bg.addColorStop(1, theme.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Neon frame for the premium tier.
 *
 * Canvas has no blur filter we can rely on across browsers, so the glow is
 * built by stroking the same rounded rect several times with a growing
 * shadowBlur - cheap, and it reads the same everywhere.
 */
function paintThemeFrame(
  ctx: CanvasRenderingContext2D,
  theme: ShareTheme,
  w: number,
  h: number,
  inset: number,
  radius: number,
) {
  if (!theme.glow) return;
  ctx.save();
  ctx.strokeStyle = theme.glow;
  ctx.shadowColor = theme.glow;
  for (const [blur, width, alpha] of [[54, 10, 0.35], [26, 6, 0.6], [10, 3, 1]] as const) {
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = blur;
    ctx.lineWidth = width;
    rRect(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
    ctx.stroke();
  }
  ctx.restore();
}


/**
 * The family the app is actually rendering in.
 *
 * The cards were drawn in Arial, which is what canvas falls back to when you
 * name a font it cannot resolve - so every shared card looked nothing like the
 * product. next/font generates a hashed family name, so it cannot be written
 * down; reading the computed style off <body> gets the real stack, and
 * fonts.ready makes sure it has actually loaded before the first measureText.
 */
async function resolveCardFont(): Promise<string> {
  const fallback = 'ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif';
  if (typeof document === "undefined") return fallback;
  try {
    await document.fonts.ready;
  } catch {
    // A browser without the Font Loading API still renders, just unhinted.
  }
  const family = getComputedStyle(document.body).fontFamily;
  return family || fallback;
}

/**
 * Fine luminance grain over the whole card.
 *
 * Flat CSS-style gradients band badly once they are exported as PNG and then
 * re-compressed by whatever the card is posted to. A little noise breaks the
 * bands up, and it is what gives the reference cards their texture. Seeded off
 * the trade id so the same trade always renders identically.
 */
function paintGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seedStr: string,
  strength = 9,
) {
  const rand = seededRandom(seedStr);
  const tile = 200;
  const noise = document.createElement("canvas");
  noise.width = tile;
  noise.height = tile;
  const nctx = noise.getContext("2d");
  if (!nctx) return;
  const img = nctx.createImageData(tile, tile);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rand() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = strength;
  }
  nctx.putImageData(img, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  for (let y = 0; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) ctx.drawImage(noise, x, y);
  }
  ctx.restore();
}

/** A hairline that fades out at both ends instead of stopping dead. */
function fadedRule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
) {
  const g = ctx.createLinearGradient(x, y, x + width, y);
  g.addColorStop(0, "rgba(255,255,255,0.13)");
  g.addColorStop(0.72, "rgba(255,255,255,0.07)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, width, 1.5);
}

/* ── FEED CARD  1080 × 1080 ────────────────────────────────────────────────── */
async function makeFeedCard(trade: JournalEntry, theme: ShareTheme, author: CardAuthor): Promise<string> {
  const font = await resolveCardFont();
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const win = trade.pnl >= 0;
  const accent = win ? "#34d399" : "#f87171";
  const dateStr = new Date(`${trade.rawDate}T00:00:00`).toLocaleDateString("en-GB",
    { day: "numeric", month: "short", year: "numeric" });

  /* Theme wash, then the card itself floating inside it. */
  paintThemeBackground(ctx, theme, S, S, true);

  const PAD = 76;
  const CW = S - PAD * 2;
  const CARD_R = 46;
  ctx.save();
  // A flat black panel sat dead on the theme wash. A vertical gradient plus a
  // one-pixel highlight along the top edge is what makes it read as a surface
  // catching light rather than a hole cut in the background.
  const panel = ctx.createLinearGradient(0, PAD, 0, PAD + CW);
  panel.addColorStop(0, "rgba(12,12,14,0.62)");
  panel.addColorStop(1, "rgba(0,0,0,0.58)");
  ctx.fillStyle = panel;
  rRect(ctx, PAD, PAD, CW, CW, CARD_R);
  ctx.fill();

  ctx.save();
  rRect(ctx, PAD, PAD, CW, CW, CARD_R);
  ctx.clip();
  const sheen = ctx.createLinearGradient(0, PAD, 0, PAD + 180);
  sheen.addColorStop(0, "rgba(255,255,255,0.055)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(PAD, PAD, CW, 180);
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  rRect(ctx, PAD, PAD, CW, CW, CARD_R);
  ctx.stroke();
  ctx.restore();

  const X = PAD + 62;               // text column
  const RIGHT = S - PAD - 62;       // right-aligned column

  /* Brand, top right: the mark plus the wordmark, then the instrument class. */
  const markSize = 34;
  ctx.font = `700 30px ${font}`;
  const wordW = ctx.measureText("Tradoxy").width;
  const sideLabel = (trade.side || "").toUpperCase();
  ctx.font = `800 21px ${font}`;
  const sideW = ctx.measureText(sideLabel).width + 30;

  let bx = RIGHT - sideW;
  ctx.fillStyle = win ? "rgba(52,211,153,.16)" : "rgba(248,113,113,.16)";
  rRect(ctx, bx, PAD + 58, sideW, 36, 10);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.font = `800 21px ${font}`;
  ctx.fillText(sideLabel, bx + 15, PAD + 83);

  bx -= 16 + wordW;
  ctx.fillStyle = "#e4e4e7";
  ctx.font = `700 30px ${font}`;
  ctx.fillText("Tradoxy", bx, PAD + 84);

  drawTradoxyMark(ctx, bx - 14 - markSize, PAD + 55, markSize, "#ffffff");

  /* Headline: the number this card exists to show. */
  ctx.fillStyle = "#a8a8b2";
  ctx.font = `600 30px ${font}`;
  ctx.fillText("Realized P/L", X, PAD + 206);

  const pnlStr = `${win ? "+" : "\u2212"}$${cash.format(Math.abs(trade.pnl))}`;
  let pnlSize = 116;
  ctx.font = `800 ${pnlSize}px ${font}`;
  while (ctx.measureText(pnlStr).width > CW - 124 && pnlSize > 62) {
    pnlSize -= 4;
    ctx.font = `800 ${pnlSize}px ${font}`;
  }
  ctx.fillStyle = accent;
  // Tight tracking on display figures; canvas defaults to loose spacing that
  // makes large numerals look accidental rather than set.
  ctx.letterSpacing = "-0.025em";
  ctx.fillText(pnlStr, X, PAD + 318);
  ctx.letterSpacing = "0em";

  ctx.fillStyle = "#e4e4e7";
  ctx.font = `600 38px ${font}`;
  ctx.fillText(trade.symbol, X, PAD + 386);

  if (trade.resultR && Math.abs(trade.resultR) > 0.01) {
    const rStr = `${trade.resultR >= 0 ? "+" : ""}${trade.resultR.toFixed(2)}R`;
    ctx.font = `700 30px ${font}`;
    const rw = ctx.measureText(rStr).width;
    ctx.fillStyle = win ? "rgba(52,211,153,.14)" : "rgba(248,113,113,.14)";
    rRect(ctx, RIGHT - rw - 30, PAD + 352, rw + 30, 48, 12);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillText(rStr, RIGHT - rw - 15, PAD + 385);
  }

  const rule = (y: number) => fadedRule(ctx, X, y, CW - 124);
  rule(PAD + 434);

  /* Entry and exit, the two numbers that make the P/L checkable. */
  const priceLabel = (label: string, value: string, x: number) => {
    ctx.fillStyle = "#90909a";
    ctx.font = `500 27px ${font}`;
    ctx.fillText(label, x, PAD + 500);
    ctx.fillStyle = "#f4f4f5";
    ctx.font = `700 44px ${font}`;
    ctx.fillText(value, x, PAD + 556);
  };
  priceLabel("Entry price", `$${cash.format(trade.entry)}`, X);
  priceLabel("Exit price", `$${cash.format(trade.exit)}`, X + (CW - 124) / 2);

  rule(PAD + 606);

  /* A second pair of facts, so the square card is not two thirds empty below
     the prices. Internal auto-sync labels never appear on a public card. */
  const isInternalLabel = (val: string) => /auto\s*sync/i.test(val);
  const clip = (val: string, max: number) => {
    ctx.font = `700 38px ${font}`;
    if (ctx.measureText(val).width <= max) return val;
    let out = val;
    while (out.length > 1 && ctx.measureText(`${out}...`).width > max) out = out.slice(0, -1);
    return `${out}...`;
  };
  const contextLabel = (label: string, value: string, x: number) => {
    ctx.fillStyle = "#90909a";
    ctx.font = `500 27px ${font}`;
    ctx.fillText(label, x, PAD + 676);
    ctx.fillStyle = "#e4e4e7";
    ctx.font = `700 38px ${font}`;
    ctx.fillText(clip(value, (CW - 148) / 2), x, PAD + 728);
  };
  const setupRaw = (trade.setup || trade.session || "").trim();
  contextLabel("Account", trade.accountName?.trim() || "Personal", X);
  contextLabel(
    "Setup",
    setupRaw && !isInternalLabel(setupRaw) ? setupRaw : trade.marketType?.trim() || "Discretionary",
    X + (CW - 124) / 2,
  );

  rule(PAD + 778);

  /* Footer: who took the trade, and the terms that make it verifiable. */
  const footY = PAD + CW - 62;
  ctx.beginPath();
  ctx.arc(X + 13, footY - 9, 13, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(52,211,153,.9)";
  ctx.fill();
  ctx.strokeStyle = "#04120c";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(X + 7, footY - 9);
  ctx.lineTo(X + 11.5, footY - 4);
  ctx.lineTo(X + 19, footY - 14);
  ctx.stroke();

  const qty = Math.max(1, Math.round(trade.quantity || 1));
  const meta = `${qty} ${qty === 1 ? "contract" : "contracts"} · ${dateStr}`;

  // The two halves are measured against each other before either is drawn.
  // Attribution is variable-length and the terms are not, so a long display
  // name shortens rather than running into the date.
  ctx.font = `500 23px ${font}`;
  const metaW = ctx.measureText(meta).width;
  const nameLeft = X + 38;
  const nameRoom = RIGHT - metaW - 28 - nameLeft;

  ctx.font = `600 23px ${font}`;
  let credit = `Verified trade by ${author.name}`;
  if (ctx.measureText(credit).width > nameRoom) {
    credit = author.name;
    while (credit.length > 1 && ctx.measureText(`${credit}...`).width > nameRoom) {
      credit = credit.slice(0, -1);
    }
    if (credit !== author.name) credit = `${credit}...`;
  }
  ctx.fillStyle = "#a8a8b2";
  ctx.fillText(credit, nameLeft, footY);

  ctx.textAlign = "right";
  ctx.fillStyle = "#7a7a84";
  ctx.font = `500 23px ${font}`;
  ctx.fillText(meta, RIGHT, footY);
  ctx.textAlign = "left";

  paintGrain(ctx, S, S, `${trade.id}-feed`);

  /* The neon frame hugs the card, not the canvas edge. */
  paintThemeFrame(ctx, theme, S, S, PAD, CARD_R);

  return canvas.toDataURL("image/png", 1);
}

/* ── STORY CARD  1080 × 1920 ──────────────────────────────────────────────── */
async function makeStoryCard(trade: JournalEntry, theme: ShareTheme, author: CardAuthor): Promise<string> {
  const font = await resolveCardFont();
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
    paintThemeBackground(ctx, theme, W, H, false);

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
    ctx.font = `900 54px ${font}`;
    ctx.fillText("TRADEWAY", X, 148);
    /* accent dot */
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(X + ctx.measureText("TRADEWAY").width + 20, 128, 10, 0, Math.PI * 2);
    ctx.fill();

    /* date */
    ctx.fillStyle = "#6b7280";
    ctx.font = `500 28px ${font}`;
    ctx.fillText(dateStr, X, 206);

    /* symbol */
    ctx.fillStyle = "#f9fafb";
    ctx.font = `900 118px ${font}`;
    ctx.fillText(trade.symbol, X, 378);

    /* chips */
    const chip = (label: string, x: number, y: number, bg2: string, fg: string) => {
      ctx.font = `800 27px ${font}`;
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
    const pnlStr = `${win ? "+" : "\u2212"}$${cash.format(Math.abs(trade.pnl))}`;
    const pnlSize = pnlStr.length > 12 ? 92 : pnlStr.length > 9 ? 108 : 126;
    ctx.fillStyle = accent;
    ctx.font = `900 ${pnlSize}px ${font}`;
    ctx.fillText(pnlStr, X, 604);

    /* R value */
    let statsY = 680;
    if (trade.resultR && Math.abs(trade.resultR) > 0.01) {
      ctx.fillStyle = accent; ctx.globalAlpha = 0.72;
      ctx.font = `700 56px ${font}`;
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
      ctx.font = `600 27px ${font}`;
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

    /* Footer: attribution, then the brand. This said "tradeway.app" long after
       the product was renamed, so every shared story carried the old name. */
    ctx.textAlign = "center";
    ctx.fillStyle = "#90909a";
    ctx.font = `600 26px ${font}`;
    ctx.fillText(`Verified trade by ${author.name}`, W / 2, H - 104);

    const brandSize = 30;
    ctx.font = `700 30px ${font}`;
    const brandW = ctx.measureText("Tradoxy").width;
    const brandLeft = (W - (brandSize + 14 + brandW)) / 2;
    drawTradoxyMark(ctx, brandLeft, H - 62 - brandSize + 6, brandSize, "#c6c6ce");
    ctx.textAlign = "left";
    ctx.fillStyle = "#c6c6ce";
    ctx.fillText("Tradoxy", brandLeft + brandSize + 14, H - 44);

    paintGrain(ctx, W, H, `${trade.id}-story`);

    paintThemeFrame(ctx, theme, W, H, 40, 62);

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
  const [theme, setTheme]           = useState<ShareTheme>(DEFAULT_THEME);

  const username  = String(user?.user_metadata?.user_name ?? user?.email?.split("@")[0] ?? "you");
  const fullName  = String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? username);
  // Memoised so the card effect below does not redraw on every render.
  const author = useMemo<CardAuthor>(
    () => ({ name: fullName, handle: username }),
    [fullName, username],
  );
  const avatarUrl = typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  useEffect(() => {
    if (!trade) {
      setCaption(""); setFeedCardUrl(""); setStoryCardUrl(""); setShared(false); setError(""); return;
    }
    const win = trade.pnl >= 0;
    const parts = [
      `${trade.symbol} ${trade.side.toUpperCase()}`,
      `${win ? "+" : "\u2212"}$${cash.format(Math.abs(trade.pnl))}`,
    ];
    if (trade.resultR && Math.abs(trade.resultR) > 0.01) parts.push(`${trade.resultR.toFixed(2)}R`);
    if (trade.setup?.trim()) parts.push(trade.setup.trim());
    let text = parts.join(" · ");
    if (trade.note?.trim() && text.length < 220) text += `\n${trade.note.trim().slice(0, 280 - text.length - 1)}`;
    setCaption(text);
    setShared(false); setError(""); setActiveTab("feed");

  }, [trade]);

  // Cards are redrawn on every theme change. Both formats are generated up
  // front so switching the Post/Story tab is instant rather than a re-render.
  useEffect(() => {
    if (!trade) return;
    let active = true;
    setGenerating(true); setFeedCardUrl(""); setStoryCardUrl("");
    Promise.all([
      makeFeedCard(trade, theme, author),
      makeStoryCard(trade, theme, author),
    ])
      .then(([feed, story]) => {
        if (!active) return;
        setFeedCardUrl(feed); setStoryCardUrl(story); setGenerating(false);
      })
      .catch(() => { if (active) setGenerating(false); });
    return () => { active = false; };
  }, [author, trade, theme]);


  /**
   * Hands the rendered card to the OS share sheet.
   *
   * This is the only route to Instagram from the web: Instagram has no public
   * share URL that accepts an image, so "share to Instagram" means handing the
   * file to the system sheet and letting the user pick it. Story vs Post is
   * decided by which format we hand over - Instagram reads the aspect ratio.
   * Desktop browsers mostly cannot share files, so the button falls back to a
   * download and says so.
   */
  const canShareFiles = () =>
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    typeof navigator.share === "function";

  const shareToDevice = async (format: "feed" | "story") => {
    const url = format === "feed" ? feedCardUrl : storyCardUrl;
    if (!trade || !url) return;
    setError("");

    const suffix = format === "feed" ? "post" : "story";
    const filename = `${trade.symbol}-${trade.rawDate}-${suffix}.png`;

    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], filename, { type: "image/png" });

      if (canShareFiles() && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${trade.symbol} ${trade.side.toUpperCase()}`,
          text: caption.slice(0, 280),
        });
        return;
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setError("Bu qurilma to'g'ridan-to'g'ri ulashishni qo'llamaydi - rasm yuklab olindi.");
    } catch (shareError) {
      // A cancelled share sheet rejects too; that is not a failure worth showing.
      if ((shareError as Error)?.name === "AbortError") return;
      setError("Ulashib bo'lmadi. Rasmni yuklab olib qo'lda joylashingiz mumkin.");
    }
  };

  const post = async () => {
    if (!trade || !caption.trim() || sharing) return;
    setSharing(true); setError("");
    try {
      let shareImageUrl: string | undefined;
      if (feedCardUrl) {
        try {
          shareImageUrl = await uploadDataUrl(
            feedCardUrl,
            `${trade.symbol}-${trade.rawDate}-tradoxy.png`,
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

  const downloadCard = (format: "feed" | "story") => {
    const url = format === "feed" ? feedCardUrl : storyCardUrl;
    if (!url || !trade) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trade.symbol}-${trade.rawDate}-${format === "feed" ? "post" : "story"}.png`;
    a.click();
  };

  if (!trade) return null;
  const win = trade.pnl >= 0;

  return (
    <Dialog open={Boolean(trade)} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[95dvh] overflow-hidden border border-[#2a2a2a] bg-surface p-0 shadow-2xl shadow-black/80 sm:max-w-lg"
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
            <p className="text-sm text-[#8a8a8a]">Tradoxy feedida chiqdi.</p>
            {storyCardUrl && (
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => void shareToDevice("story")}
                  className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">
                  <Share2 size={15} /> Story sifatida ulashish
                </button>
                <button type="button" onClick={() => downloadCard("story")}
                  className="flex items-center gap-2 rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-white/25 hover:text-white">
                  <Download size={15} /> .png
                </button>
              </div>
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
                <div className={`mt-3 overflow-hidden rounded-2xl border ${win ? "border-emerald-500/25" : "border-rose-500/25"} bg-surface-raised`}>
                  <div className={`flex items-center justify-between px-4 py-3 ${win ? "bg-emerald-500/[.06]" : "bg-rose-500/[.06]"}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-sm font-bold text-[#f1f1f1]">{trade.symbol}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${trade.side === "Long" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                        {trade.side.toUpperCase()}
                      </span>
                      {trade.setup?.trim() ? <span className="truncate text-[11px] text-[#8a8a8a]">{trade.setup}</span> : null}
                    </div>
                    <span className={`ml-3 shrink-0 font-mono text-base font-black ${win ? "text-emerald-300" : "text-rose-300"}`}>
                      {win ? "+" : "−"}${cash.format(Math.abs(trade.pnl))}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 border-t border-[#2a2a2a] px-4 py-2">
                    {trade.resultR && Math.abs(trade.resultR) > 0.01
                      ? <span className="font-mono text-[11px] text-[#8a8a8a]">{trade.resultR.toFixed(2)}R</span>
                      : null}
                    {trade.session?.trim() ? <span className="text-[11px] text-[#8a8a8a]">{trade.session}</span> : null}
                    <span className="text-[11px] text-[#8a8a8a]">{trade.date}</span>
                    <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-black ${win ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
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
                    aria-pressed={activeTab === tab}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeTab === tab ? "bg-white/10 text-[#f1f1f1]" : "text-ink-subtle hover:text-ink-soft"}`}>
                    {tab === "feed" ? "Post · 1:1" : "Story · 9:16"}
                  </button>
                ))}
              </div>

              <div className={`relative mx-auto overflow-hidden rounded-xl bg-surface-raised ${activeTab === "story" ? "aspect-[9/16] max-w-[164px]" : "aspect-square max-w-[260px]"}`}>
                {generating ? (
                  <div className="grid h-full place-items-center">
                    <LoaderCircle size={22} className="animate-spin text-ink-subtle" />
                  </div>
                ) : (
                  <MediaImage src={activeTab === "feed" ? feedCardUrl : storyCardUrl}
                    alt={activeTab === "feed" ? "Feed card preview" : "IG Story preview"}
                    className="h-full w-full object-cover" />
                )}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-ink-subtle">
                  Color theme
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {SHARE_THEMES.filter((item) => item.tier === "color").map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTheme(item)}
                      aria-label={item.label}
                      aria-pressed={theme.id === item.id}
                      style={themeSwatchStyle(item)}
                      className={`aspect-square rounded-lg border transition ${theme.id === item.id ? "border-white ring-2 ring-white/60" : "border-white/12 hover:border-white/35"}`}
                    />
                  ))}
                </div>

                <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[.14em] text-ink-subtle">
                  Premium theme
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {SHARE_THEMES.filter((item) => item.tier === "premium").map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTheme(item)}
                      aria-label={item.label}
                      aria-pressed={theme.id === item.id}
                      style={themeSwatchStyle(item)}
                      className={`aspect-square rounded-lg border transition ${theme.id === item.id ? "border-white ring-2 ring-white/60" : "border-white/12 hover:border-white/35"}`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void shareToDevice(activeTab)}
                  disabled={generating || !(activeTab === "feed" ? feedCardUrl : storyCardUrl)}
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                >
                  <Share2 size={13} />
                  {activeTab === "feed" ? "Post sifatida ulashish" : "Story sifatida ulashish"}
                </button>
                <button
                  type="button"
                  onClick={() => downloadCard(activeTab)}
                  disabled={generating || !(activeTab === "feed" ? feedCardUrl : storyCardUrl)}
                  className="flex items-center gap-2 rounded-lg border border-white/12 px-4 py-2 text-xs font-semibold text-ink-soft transition hover:border-white/25 hover:text-white disabled:opacity-50"
                >
                  <Download size={13} /> .png
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className={`text-[11px] ${caption.length > 250 ? "text-amber-400" : "text-[#8a8a8a]"}`}>
                {caption.length} / 280
              </span>
              {error ? <span className="text-xs text-rose-300">{error}</span> : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
