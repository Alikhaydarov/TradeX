type TradeOutcome = { pnl: number | null; result_r: number | null };

export function summarizeTrades(trades: readonly TradeOutcome[]) {
  const closed = trades.filter(
    (trade) => trade.pnl !== null && Number.isFinite(trade.pnl),
  );
  const pnl = closed.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const wins = closed.filter((trade) => (trade.pnl ?? 0) > 0).length;
  const losses = closed.filter((trade) => (trade.pnl ?? 0) < 0).length;
  const rValues = trades
    .map((trade) => trade.result_r)
    .filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );
  const averageR = rValues.length
    ? rValues.reduce((sum, value) => sum + value, 0) / rValues.length
    : 0;
  const grossProfit = closed.reduce(
    (sum, trade) => sum + Math.max(0, trade.pnl ?? 0),
    0,
  );
  const grossLoss = closed.reduce(
    (sum, trade) => sum + Math.abs(Math.min(0, trade.pnl ?? 0)),
    0,
  );
  return {
    pnl,
    closed: closed.length,
    wins,
    losses,
    breakeven: closed.length - wins - losses,
    winRate: closed.length ? (wins / closed.length) * 100 : 0,
    averageR,
    grossProfit,
    grossLoss,
    expectancy: closed.length ? pnl / closed.length : 0,
    profitFactor: grossLoss
      ? grossProfit / grossLoss
      : grossProfit
        ? Infinity
        : 0,
  };
}
