"use client";

import { useEffect } from "react";

function cleanText(node: Element | undefined) {
  return (node?.textContent || "").replace(/\s+/g, " ").trim();
}

function isTradeLikeButton(button: HTMLButtonElement) {
  if (button.dataset.mobileTradeCard === "true") return false;
  const text = cleanText(button);
  if (!text || text.length < 12) return false;
  if (/add trade|cancel|save|continue|login|register/i.test(text)) return false;

  const hasMoney = /[$€£]|\+\d|\-\d/.test(text);
  const hasSide = /\b(buy|sell|long|short)\b|↑|↓/i.test(text);
  const hasSymbolish = /\b[A-Z]{3,8}\b/.test(text);
  return hasMoney && (hasSide || hasSymbolish);
}

function parseRow(row: HTMLButtonElement) {
  const spans = Array.from(row.children).filter((child) => child.tagName.toLowerCase() === "span");
  const allText = cleanText(row);

  if (spans.length >= 7) {
    const date = cleanText(spans[1]);
    const symbol = cleanText(spans[2]).replace(/^[A-Z]{1,4}\s+/, "").trim() || cleanText(spans[2]);
    const side = cleanText(spans[3]);
    const meta = cleanText(spans[4]);
    const rr = cleanText(spans[5]);
    const pnl = cleanText(spans[6]);
    return { date, symbol, side, meta, rr, pnl };
  }

  const symbol = allText.match(/\b(NAS100|XAUUSD|EURUSD|GBPUSD|USDJPY|US30|US100|GER30|BTCUSD|ETHUSD|[A-Z]{5,8})\b/)?.[0] || "TRADE";
  const pnl = allText.match(/[+-]?\$?\d[\d,]*(?:\.\d{1,2})?/)?.[0] || "$0.00";
  const rr = allText.match(/[+-]?\d+(?:\.\d+)?R/i)?.[0] || "";
  const side = allText.match(/\b(sell|short)\b|↓/i) ? "Sell" : "Buy";
  const date = allText.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\s+[A-Za-z]{3}/)?.[0] || "";
  return { date, symbol, side, meta: "", rr, pnl };
}

function buildCard(row: HTMLButtonElement) {
  const { symbol, side, pnl } = parseRow(row);
  const winning = !String(pnl).trim().startsWith("-");
  const isSell = /sell|short|↓/i.test(side);

  const card = document.createElement("button");
  card.type = "button";
  card.setAttribute("data-mobile-trade-card", "true");
  card.className = "w-full rounded-2xl border border-white/10 bg-[#101010] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition active:scale-[.99]";
  card.addEventListener("click", () => row.click());

  const sideClass = isSell ? "bg-rose-500/25 text-rose-200" : "bg-emerald-500/18 text-emerald-200";
  const pnlClass = winning ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300";
  const cleanSymbol = symbol.replace(/[^A-Z0-9+]/gi, "").toUpperCase() || "TRADE";

  card.innerHTML = `
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <span class="grid size-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#151515] text-[9px] font-black text-zinc-300">${cleanSymbol.slice(0, 2)}</span>
        <strong class="min-w-0 truncate text-lg font-black tracking-[-0.03em] text-white">${cleanSymbol}</strong>
        <span class="shrink-0 text-base">🇺🇸</span>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span class="rounded-xl px-3 py-1.5 font-mono text-sm font-black ${pnlClass}">${pnl}</span>
        <span class="text-xl leading-none text-zinc-500">⌃</span>
      </div>
    </div>
    <div class="mt-3 flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <span class="rounded-lg px-2.5 py-1 text-xs font-black uppercase ${sideClass}">${isSell ? "SELL" : "BUY"}</span>
        <span class="truncate text-base font-bold text-zinc-300">1.00 Lots</span>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <span class="rounded-md bg-rose-500/20 px-2 py-1 text-xs font-black text-rose-200">SL</span>
        <span class="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-black text-emerald-300">TP</span>
      </div>
    </div>
  `;

  return card;
}

function findTradeRows() {
  const main = document.querySelector("main");
  if (!main) return [] as HTMLButtonElement[];

  const buttons = Array.from(main.querySelectorAll("button")) as HTMLButtonElement[];
  return buttons.filter(isTradeLikeButton);
}

function findDesktopContainer(rows: HTMLButtonElement[]) {
  if (!rows.length) return null;

  const first = rows[0];
  let current: HTMLElement | null = first.parentElement;
  while (current && current !== document.body) {
    const count = Array.from(current.querySelectorAll("button")).filter(isTradeLikeButton).length;
    if (count >= Math.min(2, rows.length)) return current;
    current = current.parentElement;
  }
  return first.parentElement;
}

function syncMobileTradeCards() {
  const rows = findTradeRows();
  if (!rows.length) return;

  const desktopContainer = findDesktopContainer(rows);
  if (!desktopContainer) return;

  const existing = desktopContainer.parentElement?.querySelector("[data-mobile-trades-list='true']") as HTMLElement | null;
  if (existing) existing.remove();

  desktopContainer.classList.add("hidden", "md:block");

  const list = document.createElement("div");
  list.setAttribute("data-mobile-trades-list", "true");
  list.className = "grid gap-2.5 p-3 md:hidden";

  for (const row of rows) {
    const card = buildCard(row);
    if (card) list.appendChild(card);
  }

  desktopContainer.parentElement?.insertBefore(list, desktopContainer);
}

export function MobileTradesBridge() {
  useEffect(() => {
    const run = () => window.requestAnimationFrame(syncMobileTradeCards);
    run();
    const interval = window.setInterval(run, 900);

    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return null;
}
