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
  let score = 84;
  const losses = trades.filter((trade) => trade.pnl < 0);
  const errorCount = trades.filter((trade) => trade.errorMade).length;
  const missingSetup = trades.filter((trade) => !trade.setup).length;
  const missingNote = trades.filter((trade) => !trade.note).length;
  const missingSession = trades.filter((trade) => !trade.session).length;
  const planBreaks = trades.filter((trade) => !trade.followingPlan).length;
  const overRisk = trades.filter((trade) => Math.abs(trade.resultR) > 5 || trade.riskAmount > 0 && Math.abs(trade.pnl) > trade.riskAmount * 4).length;
  score -= Math.min(25, errorCount * 5);
  score -= Math.min(16, missingSetup * 3);
  score -= Math.min(10, missingNote * 2);
  score -= Math.min(8, missingSession * 1);
  score -= Math.min(18, planBreaks * 6);
  score -= Math.min(18, overRisk * 6);
  if (losses.length >= Math.ceil(trades.length * 0.6)) score -= 8;
  return Math.max(0, Math.min(100, score));
}

function todayId() {
  return new Date().toISOString().slice(0, 10);
}

export function buildRuleCoachReport(trades: CoachTrade[]): TradeCoachReport {
  const ordered = [...trades].sort((a, b) => new Date(a.tradedAt).getTime() - new Date(b.tradedAt).getTime());
  const latest = ordered.at(-1);
  const recent = ordered.slice(-12);
  const wins = ordered.filter((trade) => trade.pnl > 0);
  const losses = ordered.filter((trade) => trade.pnl < 0);
  const totalPnl = ordered.reduce((sum, trade) => sum + trade.pnl, 0);
  const avgR = ordered.length ? ordered.reduce((sum, trade) => sum + trade.resultR, 0) / ordered.length : 0;
  const todayTrades = ordered.filter((trade) => trade.tradedAt === todayId());
  const todayPnl = todayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const recentThree = ordered.slice(-3);
  const lossStreak = recentThree.length === 3 && recentThree.every((trade) => trade.pnl < 0);
  const score = scoreTrades(ordered);
  const mood: TradeCoachReport["mood"] = score < 60 || lossStreak || todayPnl < 0 && todayTrades.length >= 2 ? "protect" : score > 82 ? "push" : "neutral";

  const mistakes = unique([
    ...recent.filter((trade) => trade.errorMade && trade.mistakeType).map((trade) => trade.mistakeType),
    recent.some((trade) => !trade.setup) ? "Setup nomi yozilmagan tradelar bor. Modelni takrorlash uchun setup nomi majburiy." : "",
    recent.some((trade) => !trade.note) ? "Review note yetishmayapti. Har trade'dan keyin bitta aniq lesson yoz." : "",
    recent.some((trade) => !trade.followingPlan) ? "Plan discipline buzilgan trade bor. Entry oldidan checklist ishlat." : "",
    lossStreak ? "Oxirgi 3 ta trade loss. Bu revenge trade xavfini oshiradi." : "",
  ]).slice(0, 5);

  const riskWarnings = unique([
    lossStreak ? "Mandatory pause: 3 loss ketma-ket. Keyingi trade oldidan kamida 30 daqiqa tanaffus qil." : "",
    todayTrades.length && todayPnl < 0 ? `Bugungi P&L ${money(todayPnl)}. Bugun riskni oshirma va faqat A+ setup qoldir.` : "",
    recent.some((trade) => trade.riskAmount > 0 && Math.abs(trade.pnl) > trade.riskAmount * 4) ? "Bir yoki bir nechta trade planned riskdan katta siljigan. Lot size va SL discipline'ni tekshir." : "",
    totalPnl < 0 ? `Sample P&L ${money(totalPnl)}. Kapitalni himoya qilish foyda qilishdan oldin turadi.` : "",
    avgR < 0 ? "Average R manfiy. Edge tasdiqlanmaguncha trade sonini kamaytir." : "",
  ]).slice(0, 5);

  const strengths = unique([
    wins.length > losses.length ? "Win count loss countdan yuqori — discipline saqlansa edge shakllanishi mumkin." : "",
    avgR > 1 ? `Average R kuchli: ${avgR.toFixed(2)}R.` : "",
    recent.some((trade) => trade.setup) ? "Setup tagging boshlangan — AI endi qaysi model ishlayotganini ko'ra oladi." : "",
    recent.every((trade) => trade.followingPlan) ? "Recent trades ichida plan break belgilanmagan." : "",
  ]).slice(0, 4);

  const nextSteps = unique([
    mood === "protect" ? "Keyingi sessiya: maximum 1 ta trade, riskni pasaytir, birinchi rule breakdan keyin to'xta." : "",
    mood === "push" ? "Discipline yaxshi. Riskni oshirmasdan faqat shu modelni takrorla." : "",
    "Entry oldidan: setup nomi, invalidation, risk amount, session va target yozilgan bo'lsin.",
    "Trade yopilgandan keyin: following plan, mistake type va bitta lesson yoz.",
    latest ? `Birinchi review: oxirgi ${latest.symbol} trade'ni tekshir, chunki u eng yangi execution sample.` : "",
  ]).slice(0, 5);

  return {
    title: mood === "protect" ? "AI Coach: capital protection mode" : mood === "push" ? "AI Coach: discipline yaxshi, davom et" : "AI Coach: execution focus",
    summary: latest
      ? `Oxirgi trade: ${latest.symbol} ${latest.side} ${money(latest.pnl)}. Sample P&L ${money(totalPnl)} / ${ordered.length} trade. Bugungi P&L: ${money(todayPnl)}.`
      : "Hali trade yo'q. Trade qo'shilsa AI risk, discipline va journal sifatini kuzatadi.",
    score,
    mood,
    strengths: strengths.length ? strengths : ["Journal structure AI coach uchun tayyor."],
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
            content: "You are TradeWay AI Coach. Return only compact JSON. Be direct, strict, and practical. Do not give financial advice or trade signals; focus on risk, discipline, journaling, psychology, execution quality, warnings, reminders, and next actions. Use Uzbek Latin when possible.",
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
