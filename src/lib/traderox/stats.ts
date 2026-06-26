import type { TraderoxGroupStats, TraderoxStats, TraderoxTrade } from "./types";

function emptyGroup(): TraderoxGroupStats {
  return { trades: 0, wins: 0, losses: 0, winRate: 0, netPnl: 0 };
}

function addToGroup(group: TraderoxGroupStats, pnl: number) {
  group.trades += 1;
  group.netPnl += pnl;
  if (pnl > 0) group.wins += 1;
  if (pnl < 0) group.losses += 1;
  group.winRate = group.trades ? Math.round((group.wins / group.trades) * 100) : 0;
}

export function calculateTraderoxStats(trades: TraderoxTrade[]): TraderoxStats {
  const stats: TraderoxStats = {
    totalTrades: trades.length,
    wins: 0,
    losses: 0,
    winRate: 0,
    netPnl: 0,
    grossProfit: 0,
    grossLoss: 0,
    profitFactor: 0,
    bySymbol: {},
    bySession: {},
  };

  for (const trade of trades) {
    const pnl = Number(trade.netPnl || 0);
    stats.netPnl += pnl;
    if (pnl > 0) {
      stats.wins += 1;
      stats.grossProfit += pnl;
    }
    if (pnl < 0) {
      stats.losses += 1;
      stats.grossLoss += Math.abs(pnl);
    }

    const symbol = trade.symbol || "UNKNOWN";
    const session = trade.sessionName || "unknown";
    stats.bySymbol[symbol] ??= emptyGroup();
    stats.bySession[session] ??= emptyGroup();
    addToGroup(stats.bySymbol[symbol], pnl);
    addToGroup(stats.bySession[session], pnl);
  }

  stats.winRate = stats.totalTrades ? Math.round((stats.wins / stats.totalTrades) * 100) : 0;
  stats.profitFactor = stats.grossLoss > 0
    ? Number((stats.grossProfit / stats.grossLoss).toFixed(2))
    : stats.grossProfit > 0 ? 999 : 0;
  stats.netPnl = Number(stats.netPnl.toFixed(2));
  stats.grossProfit = Number(stats.grossProfit.toFixed(2));
  stats.grossLoss = Number(stats.grossLoss.toFixed(2));

  return stats;
}
