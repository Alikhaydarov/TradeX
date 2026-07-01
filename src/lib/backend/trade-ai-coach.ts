interface CoachTrade {
  id: string;
  symbol: string;
  side: string;
  pnl: number;
  resultR: number;
  riskAmount: number;
  setup: string;
  session: string;
  followingPlan: boolean;
  errorMade: boolean;
  mistakeType: string;
  note: string;
  tradedAt: string;
}

export interface TradeCoachReport {
  title: string;
  summary: string;
  score: number;
  mood: "protect" | "neutral" | "push";
  strengths: string[];
  mistakes: string[];
  riskWarnings: string[];
  nextSteps: string[];
  focusTradeId?: string;
  generatedBy: "rules" | "openai";
}

function money(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function scoreTrades(trades: CoachTrade[]) {
  if (!trades.length) return 60;
  let score = 82;
  const losses = trades.filter((trade) => trade.pnl < 0);
  const errorCount = trades.filter((trade) => trade.errorMade).length;
  const missingSetup = trades.filter((trade) => !trade.setup).length;
  const planBreaks = trades.filter((trade) => !trade.followingPlan).length;
  const overRisk = trades.filter((trade) => Math.abs(trade.resultR) > 5 || trade.riskAmount > 0 && Math.abs(trade.pnl) > trade.riskAmount * 4).length;
  score -= Math.min(25, errorCount * 5);
  score -= Math.min(18, missingSetup * 3);
  score -= Math.min(18, planBreaks * 6);
  score -= Math.min(15, overRisk * 5);
  if (losses.length >= Math.ceil(trades.length * 0.6)) score -= 8;
  return Math.max(0, Math.min(100, score));
}

export function buildRuleCoachReport(trades: CoachTrade[]): TradeCoachReport {
  const ordered = [...trades].sort((a, b) => new Date(a.tradedAt).getTime() - new Date(b.tradedAt).getTime());
  const latest = ordered.at(-1);
  const wins = ordered.filter((trade) => trade.pnl > 0);
  const losses = ordered.filter((trade) => trade.pnl < 0);
  const totalPnl = ordered.reduce((sum, trade) => sum + trade.pnl, 0);
  const avgR = ordered.length ? ordered.reduce((sum, trade) => sum + trade.resultR, 0) / ordered.length : 0;
  const score = scoreTrades(ordered);
  const mood: TradeCoachReport["mood"] = score < 60 ? "protect" : score > 82 ? "push" : "neutral";

  const mistakes = unique([
    ...ordered.filter((trade) => trade.errorMade && trade.mistakeType).map((trade) => trade.mistakeType),
    ordered.some((trade) => !trade.setup) ? "Some trades have no setup name, so the model cannot be repeated cleanly." : "",
    ordered.some((trade) => !trade.followingPlan) ? "Plan discipline was broken on at least one trade." : "",
    losses.length >= 3 && losses.slice(-3).length === 3 ? "Recent loss streak requires a mandatory pause." : "",
  ]).slice(0, 5);

  const riskWarnings = unique([
    ordered.some((trade) => trade.riskAmount > 0 && Math.abs(trade.pnl) > trade.riskAmount * 4) ? "One or more trades moved far beyond planned risk. Check SL discipline and position size." : "",
    totalPnl < 0 ? `Account is currently down ${money(totalPnl)} in this sample. Protect capital before increasing frequency.` : "",
    avgR < 0 ? "Average R is negative. The edge is not proven yet; reduce trade count and wait for A+ setups." : "",
  ]).slice(0, 4);

  const strengths = unique([
    wins.length > losses.length ? "Win rate is holding better than loss count." : "",
    avgR > 1 ? `Average R is strong at ${avgR.toFixed(2)}R.` : "",
    ordered.some((trade) => trade.setup) ? "Setup tagging has started, which makes pattern review possible." : "",
  ]).slice(0, 4);

  const nextSteps = unique([
    mood === "protect" ? "Next session: trade smaller, maximum 1-2 attempts, and stop after the first rule break." : "",
    "Before entry: write setup name, invalidation point, and risk amount.",
    "After close: mark whether the plan was followed and write one concrete lesson.",
    latest ? `Review the latest ${latest.symbol} trade first because it is the freshest execution sample.` : "",
  ]).slice(0, 5);

  return {
    title: mood === "protect" ? "AI Coach: protect capital" : mood === "push" ? "AI Coach: edge forming" : "AI Coach: execution focus",
    summary: latest
      ? `Last trade: ${latest.symbol} ${latest.side} closed ${money(latest.pnl)}. Sample P&L is ${money(totalPnl)} across ${ordered.length} trades.`
      : "No trades yet. Add trades to unlock a useful coaching report.",
    score,
    mood,
    strengths: strengths.length ? strengths : ["Journal structure is ready for coaching."],
    mistakes,
    riskWarnings,
    nextSteps,
    focusTradeId: latest?.id,
    generatedBy: "rules",
  };
}

function textFromResponse(payload: unknown) {
  const output = (payload as { output_text?: unknown }).output_text;
  if (typeof output === "string") return output;
  const items = (payload as { output?: unknown }).output;
  if (Array.isArray(items)) {
    for (const item of items) {
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string" && text.trim()) return text;
      }
    }
  }
  return "";
}

export async function buildAiCoachReport(trades: CoachTrade[]): Promise<TradeCoachReport> {
  const fallback = buildRuleCoachReport(trades);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !trades.length) return fallback;

  const model = process.env.OPENAI_TRADE_COACH_MODEL || "gpt-5.2-mini";
  const compactTrades = trades.slice(0, 80).map((trade) => ({
    symbol: trade.symbol,
    side: trade.side,
    pnl: trade.pnl,
    resultR: trade.resultR,
    riskAmount: trade.riskAmount,
    setup: trade.setup,
    session: trade.session,
    followingPlan: trade.followingPlan,
    errorMade: trade.errorMade,
    mistakeType: trade.mistakeType,
    tradedAt: trade.tradedAt,
    note: trade.note?.slice(0, 220),
  }));

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: "You are TradeWay AI Coach. Return only compact JSON. Be direct, strict, and practical. Do not give financial advice or trade signals; focus on risk, discipline, journaling, and execution quality.",
          },
          {
            role: "user",
            content: JSON.stringify({
              fallback,
              trades: compactTrades,
              schema: {
                title: "string",
                summary: "string",
                score: "number 0-100",
                mood: "protect|neutral|push",
                strengths: "string[]",
                mistakes: "string[]",
                riskWarnings: "string[]",
                nextSteps: "string[]",
              },
            }),
          },
        ],
        text: { format: { type: "json_object" } },
      }),
    });

    if (!response.ok) return fallback;
    const payload = await response.json() as unknown;
    const parsed = JSON.parse(textFromResponse(payload)) as Partial<TradeCoachReport>;
    return {
      ...fallback,
      ...parsed,
      score: typeof parsed.score === "number" ? Math.max(0, Math.min(100, parsed.score)) : fallback.score,
      mood: parsed.mood === "protect" || parsed.mood === "push" || parsed.mood === "neutral" ? parsed.mood : fallback.mood,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : fallback.strengths,
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes.slice(0, 5) : fallback.mistakes,
      riskWarnings: Array.isArray(parsed.riskWarnings) ? parsed.riskWarnings.slice(0, 5) : fallback.riskWarnings,
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 5) : fallback.nextSteps,
      generatedBy: "openai",
    };
  } catch {
    return fallback;
  }
}

export function mapJournalTrade(row: Record<string, unknown>): CoachTrade {
  return {
    id: String(row.id),
    symbol: String(row.symbol || ""),
    side: String(row.side || ""),
    pnl: Number(row.pnl || 0),
    resultR: Number(row.result_r || 0),
    riskAmount: Number(row.risk_amount || 0),
    setup: String(row.setup || ""),
    session: String(row.session || ""),
    followingPlan: row.following_plan !== false,
    errorMade: Boolean(row.error_made),
    mistakeType: String(row.mistake_type || ""),
    note: String(row.note || ""),
    tradedAt: String(row.traded_at || ""),
  };
}
