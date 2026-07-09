"use client";

import { useEffect } from "react";

function cleanText(node: Element | undefined) {
  return (node?.textContent || "").replace(/\s+/g, " ").trim();
}

function isTradeHeader(element: Element) {
  const value = cleanText(element);
  return value.includes("Entry date") && value.includes("Symbol") && value.includes("Side") && value.includes("Trade duration") && value.includes("Risk/Reward") && value.includes("P&L");
}

function buildCard(row: HTMLButtonElement) {
  const spans = Array.from(row.children).filter((child) => child.tagName.toLowerCase() === "span");
  if (spans.length < 7) return null;

  const date = cleanText(spans[1]);
  const symbol = cleanText(spans[2]).replace(/^[A-Z]{1,4}\s+/, "").trim() || cleanText(spans[2]);
  const side = cleanText(spans[3]);
  const meta = cleanText(spans[4]);
  const rr = cleanText(spans[5]);
  const pnl = cleanText(spans[6]);
  const winning = !pnl.startsWith("-");
  const isSell = /sell|short|↓/i.test(side);

  const card = document.createElement("button");
  card.type = "button";
  card.setAttribute("data-mobile-trade-card", "true");
  card.className = "w-full rounded-2xl border border-white/10 bg-[#101010] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition active:scale-[.99]";
  card.addEventListener("click", () => row.click());

  const sideClass = isSell ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/15 text-emerald-200";
  const pnlClass = winning ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300";

  card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 items-center gap-2">
          <span class="grid size-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#151515] text-[10px] font-black text-zinc-300">${symbol.slice(0, 2).toUpperCase()}</span>
          <strong class="min-w-0 truncate text-xl font-black tracking-[-0.03em] text-white">${symbol}</strong>
          <span class="shrink-0 text-lg">🇺🇸</span>
        </div>
        <div class="mt-3 flex min-w-0 items-center gap-2">
          <span class="rounded-lg px-2.5 py-1 text-xs font-black uppercase ${sideClass}">${isSell ? "SELL" : "BUY"}</span>
          <span class="truncate text-base font-bold text-zinc-300">1.00 Lots</span>
        </div>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <span class="rounded-xl px-3 py-1.5 font-mono text-sm font-black ${pnlClass}">${pnl}</span>
        <span class="text-2xl leading-none text-zinc-500">⌃</span>
      </div>
    </div>
    <div class="mt-4 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate text-xs font-semibold text-zinc-500">${meta || date || "Trade"}</p>
        <p class="mt-1 text-[11px] text-zinc-600">${date}</p>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <span class="rounded-md bg-rose-500/20 px-2 py-1 text-xs font-black text-rose-200">SL</span>
        <span class="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-black text-emerald-300">TP</span>
        <span class="rounded-md bg-white/[.055] px-2 py-1 font-mono text-xs font-bold text-zinc-300">${rr || "0.00R"}</span>
      </div>
    </div>
  `;

  return card;
}

function syncMobileTradeCards() {
  const headers = Array.from(document.querySelectorAll("main div")).filter(isTradeHeader);

  for (const header of headers) {
    const tableInner = header.parentElement as HTMLElement | null;
    const desktopWrap = tableInner?.parentElement as HTMLElement | null;
    const rowsWrap = header.nextElementSibling as HTMLElement | null;
    if (!tableInner || !desktopWrap || !rowsWrap) continue;
    if (desktopWrap.dataset.mobileTradesReady === "true") continue;

    const rows = Array.from(rowsWrap.querySelectorAll("button")) as HTMLButtonElement[];
    if (!rows.length) continue;

    desktopWrap.dataset.mobileTradesReady = "true";
    desktopWrap.classList.add("hidden", "md:block");

    const list = document.createElement("div");
    list.setAttribute("data-mobile-trades-list", "true");
    list.className = "grid gap-3 p-3 md:hidden";

    for (const row of rows) {
      const card = buildCard(row);
      if (card) list.appendChild(card);
    }

    desktopWrap.parentElement?.insertBefore(list, desktopWrap);
  }
}

export function MobileTradesBridge() {
  useEffect(() => {
    syncMobileTradeCards();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(syncMobileTradeCards);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
