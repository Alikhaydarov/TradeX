import type { TraderoxAccount, TraderoxFinding, TraderoxStats, TraderoxTrade } from "./types";

function dateKey(value?: string | null) {
  return value ? value.slice(0, 10) : "unknown";
}

function sortedTrades(trades: TraderoxTrade[]) {
  return [...trades].sort((a, b) => {
    const left = new Date(a.closedAt || a.openedAt || 0).getTime();
    const right = new Date(b.closedAt || b.openedAt || 0).getTime();
    return left - right;
  });
}

function addFinding(findings: TraderoxFinding[], finding: TraderoxFinding) {
  findings.push(finding);
}

export function runTraderoxRules(
  trades: TraderoxTrade[],
  stats: TraderoxStats,
  account: TraderoxAccount = {},
) {
  const findings: TraderoxFinding[] = [];
  const ordered = sortedTrades(trades);
  const byDay = new Map<string, TraderoxTrade[]>();

  for (const trade of ordered) {
    const key = dateKey(trade.closedAt || trade.openedAt);
    byDay.set(key, [...(byDay.get(key) || []), trade]);
  }

  for (const [day, dayTrades] of byDay.entries()) {
    if (dayTrades.length > 8) {
      addFinding(findings, {
        type: "overtrading",
        severity: "danger",
        title: "Overtrading danger",
        message: `${day} kuni ${dayTrades.length} ta trade ochilgan. Bu juda yuqori aktivlik.`,
        metadata: { day, trades: dayTrades.length },
      });
    } else if (dayTrades.length > 5) {
      addFinding(findings, {
        type: "overtrading",
        severity: "warning",
        title: "Overtrading warning",
        message: `${day} kuni ${dayTrades.length} ta trade ochilgan. Limitni tekshiring.`,
        metadata: { day, trades: dayTrades.length },
      });
    }

    const net = dayTrades.reduce((sum, trade) => sum + Number(trade.netPnl || 0), 0);
    const dailyLimit = account.dailyLossLimit || 0;
    if (dailyLimit > 0 && net < 0) {
      const usage = Math.abs(net) / dailyLimit;
      if (usage >= 0.9) {
        addFinding(findings, {
          type: "daily_loss_limit",
          severity: "danger",
          title: "Daily loss limit danger",
          message: `${day} kuni daily loss limitning ${Math.round(usage * 100)}% qismi ishlatilgan.`,
          metadata: { day, netPnl: net, usage },
        });
      } else if (usage >= 0.7) {
        addFinding(findings, {
          type: "daily_loss_limit",
          severity: "warning",
          title: "Daily loss limit warning",
          message: `${day} kuni daily loss limitning ${Math.round(usage * 100)}% qismiga yaqinlashilgan.`,
          metadata: { day, netPnl: net, usage },
        });
      }
    }
  }

  let currentLossStreak = 0;
  let maxLossStreak = 0;
  let revengeFound = false;
  for (const trade of ordered) {
    const pnl = Number(trade.netPnl || 0);
    if (pnl < 0) {
      currentLossStreak += 1;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    } else {
      if (currentLossStreak >= 2 && pnl !== 0) revengeFound = true;
      currentLossStreak = 0;
    }
  }

  if (maxLossStreak >= 4) {
    addFinding(findings, {
      type: "loss_streak",
      severity: "danger",
      title: "Large loss streak",
      message: `${maxLossStreak} ta ketma-ket loss aniqlangan.`,
      metadata: { maxLossStreak },
    });
  } else if (maxLossStreak >= 2) {
    addFinding(findings, {
      type: "loss_streak",
      severity: "warning",
      title: "Loss streak",
      message: `${maxLossStreak} ta ketma-ket loss bor. Pause qoidasi kerak.`,
      metadata: { maxLossStreak },
    });
  }

  if (revengeFound) {
    addFinding(findings, {
      type: "revenge_trading",
      severity: "warning",
      title: "Revenge trading xavfi bor",
      message: "2 ta lossdan keyin trading davom etgan. Bu emotional trading signali.",
    });
  }

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    const previousPnl = Number(previous.netPnl || 0);
    const prevRisk = Number(previous.riskPercent || previous.riskAmount || 0);
    const currentRisk = Number(current.riskPercent || current.riskAmount || 0);
    if (previousPnl < 0 && prevRisk > 0 && currentRisk > prevRisk * 1.5) {
      addFinding(findings, {
        type: "risk_increase_after_loss",
        severity: "danger",
        title: "Risk increased after loss",
        message: "Lossdan keyingi trade risk hajmi keskin oshgan.",
        metadata: { previousRisk: prevRisk, currentRisk },
      });
      break;
    }
  }

  for (const [symbol, group] of Object.entries(stats.bySymbol)) {
    if (group.trades >= 3 && group.netPnl < 0 && group.winRate < 45) {
      addFinding(findings, {
        type: "bad_symbol_performance",
        severity: "warning",
        title: `${symbol} performance weak`,
        message: `${symbol} bo'yicha winrate ${group.winRate}% va P&L ${group.netPnl}.`,
        metadata: { symbol, ...group },
      });
    }
  }

  for (const [session, group] of Object.entries(stats.bySession)) {
    if (group.trades >= 3 && group.netPnl < 0) {
      addFinding(findings, {
        type: "bad_session_performance",
        severity: "warning",
        title: `${session} session is weak`,
        message: `${session} session bo'yicha net P&L ${group.netPnl}.`,
        metadata: { session, ...group },
      });
    }
  }

  const missingSetup = trades.filter((trade) => !trade.setupName).length;
  if (trades.length >= 5 && missingSetup / trades.length >= 0.4) {
    addFinding(findings, {
      type: "missing_setup_notes",
      severity: "warning",
      title: "Setup notes are missing",
      message: `${missingSetup}/${trades.length} trade setup nomisiz saqlangan.`,
      metadata: { missingSetup, totalTrades: trades.length },
    });
  }

  return findings;
}
