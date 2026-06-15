import {
  authenticateRequest,
  badRequest,
  serverError,
} from "@/lib/backend/auth";

export const runtime = "nodejs";

interface BacktestPayload {
  asset?: string;
  strategy?: string;
  timeframe?: string;
  period?: string;
  initialBalance?: number;
  riskPercent?: number;
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomGenerator(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function simulateBacktest(payload: Required<BacktestPayload>) {
  const seed = hashSeed(
    `${payload.asset}:${payload.strategy}:${payload.timeframe}:${payload.period}:${payload.riskPercent}`,
  );
  const random = randomGenerator(seed);
  const tradesCount = payload.period === "5 yil" ? 320 : payload.period === "3 yil" ? 220 : 140;
  const strategyEdge = payload.strategy === "Breakout" ? 0.54 : payload.strategy === "RSI Reversal" ? 0.52 : 0.56;
  const risk = payload.riskPercent / 100;
  let equity = payload.initialBalance;
  let peak = equity;
  let maxDrawdown = 0;
  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  const points: Array<{ step: number; equity: number }> = [{ step: 0, equity }];

  for (let index = 1; index <= tradesCount; index += 1) {
    const won = random() < strategyEdge;
    const resultR = won ? 0.7 + random() * 1.4 : -(0.55 + random() * 0.65);
    const change = equity * risk * resultR;
    equity = Math.max(payload.initialBalance * 0.05, equity + change);

    if (won) {
      wins += 1;
      grossProfit += change;
    } else {
      grossLoss += Math.abs(change);
    }

    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, ((peak - equity) / peak) * 100);
    if (index % Math.max(1, Math.floor(tradesCount / 36)) === 0 || index === tradesCount) {
      points.push({ step: index, equity: Number(equity.toFixed(2)) });
    }
  }

  return {
    asset: payload.asset,
    strategy: payload.strategy,
    timeframe: payload.timeframe,
    period: payload.period,
    initialBalance: payload.initialBalance,
    netReturn: Number((((equity / payload.initialBalance) - 1) * 100).toFixed(2)),
    winRate: Number(((wins / tradesCount) * 100).toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    profitFactor: Number((grossProfit / Math.max(grossLoss, 1)).toFixed(2)),
    tradesCount,
    equityCurve: points,
  };
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return Response.json({ runs: [] });

  const { data, error } = await auth.supabase
    .from("backtest_runs")
    .select("id, asset, strategy, timeframe, period, net_return, win_rate, max_drawdown, profit_factor, trades_count, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) return serverError(error.message);
  return Response.json({ runs: data });
}

export async function POST(request: Request) {
  const body = (await request.json()) as BacktestPayload;
  const payload: Required<BacktestPayload> = {
    asset: body.asset || "BTC/USDT",
    strategy: body.strategy || "EMA Crossover",
    timeframe: body.timeframe || "4 soat",
    period: body.period || "2 yil",
    initialBalance: Number(body.initialBalance ?? 10000),
    riskPercent: Number(body.riskPercent ?? 1),
  };

  if (!Number.isFinite(payload.initialBalance) || payload.initialBalance < 100) {
    return badRequest("Boshlang'ich balans kamida $100 bo'lishi kerak.");
  }
  if (!Number.isFinite(payload.riskPercent) || payload.riskPercent <= 0 || payload.riskPercent > 5) {
    return badRequest("Risk 0% dan katta va 5% dan oshmasligi kerak.");
  }

  const result = simulateBacktest(payload);
  const auth = await authenticateRequest(request);

  if (auth) {
    const { data, error } = await auth.supabase
      .from("backtest_runs")
      .insert({
        user_id: auth.user.id,
        asset: result.asset,
        strategy: result.strategy,
        timeframe: result.timeframe,
        period: result.period,
        initial_balance: result.initialBalance,
        net_return: result.netReturn,
        win_rate: result.winRate,
        max_drawdown: result.maxDrawdown,
        profit_factor: result.profitFactor,
        trades_count: result.tradesCount,
        equity_curve: result.equityCurve,
      })
      .select("id, created_at")
      .single();

    if (error) return serverError(error.message);
    return Response.json({ result: { ...result, id: data.id, createdAt: data.created_at } });
  }

  return Response.json({ result });
}
