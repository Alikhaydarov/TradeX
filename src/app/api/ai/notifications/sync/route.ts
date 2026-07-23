import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { requireProAi } from "@/lib/backend/pro-ai";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "openai/gpt-oss-20b";
const FOREX_FACTORY_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const syncTimes = new Map<string, number>();
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;

type AccountRow = {
  id: string;
  name: string;
  initial_balance?: string | number | null;
  daily_drawdown?: string | number | null;
  max_drawdown?: string | number | null;
};

type JournalRow = {
  prop_account_id?: string | null;
  pnl?: string | number | null;
  result_r?: string | number | null;
  risk_amount?: string | number | null;
  following_plan?: boolean | null;
  error_made?: boolean | null;
  mistake_type?: string | null;
  setup?: string | null;
  session?: string | null;
  traded_at?: string | null;
  created_at?: string | null;
};

type ForexFactoryEvent = {
  title?: string;
  country?: string;
  date?: string;
  impact?: string;
};

type Signal = {
  dedupeKey: string;
  type: string;
  category: "risk" | "performance" | "psychology" | "market" | "achievement";
  priority: "high" | "medium" | "insight";
  message: string;
  accountId: string | null;
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function nyDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function nyTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(value);
}

function tradeDate(row: JournalRow) {
  const value = row.traded_at || row.created_at || "";
  if (!value) return null;
  const hasZone = /z$|[+-]\d{2}:?\d{2}$/i.test(value);
  const parsed = new Date(hasZone || value.includes("T") ? value : `${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function tradeTimestamp(row: JournalRow) {
  const preferred = row.created_at || row.traded_at || "";
  const parsed = new Date(preferred);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function limitAmount(raw: unknown, initialBalance: number) {
  const value = numberValue(raw);
  if (value <= 0) return 0;
  return value <= 100 && initialBalance > 0 ? (initialBalance * value) / 100 : value;
}

function weekKey(now: Date) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function missingSmartColumns(message: string) {
  return /dedupe_key|entity_id|entity_type|metadata|schema cache/i.test(message);
}

function parseJsonArray(content: string) {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Array<{ key?: string; message?: string }>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function rewriteSignals(signals: Signal[]) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || !signals.length) return signals;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_completion_tokens: 650,
        messages: [
          {
            role: "system",
            content:
              "You write concise Tradox AI trading-journal notifications. Return a valid JSON array only. Preserve every supplied key exactly. Each item must be {key,message}. Keep each message under 220 characters. Do not give market direction, signals, profit promises or instructions to increase risk. Keep all supplied numbers accurate. Use a calm professional tone.",
          },
          {
            role: "user",
            content: JSON.stringify(signals.map((signal) => ({ key: signal.dedupeKey, message: signal.message }))),
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) return signals;
    const payload = (await response.json().catch(() => ({}))) as GroqResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return signals;

    const rewritten = new Map(
      parseJsonArray(content)
        .filter((item) => item.key && item.message)
        .map((item) => [String(item.key), String(item.message).slice(0, 500)]),
    );

    return signals.map((signal) => ({
      ...signal,
      message: rewritten.get(signal.dedupeKey) || signal.message,
    }));
  } catch {
    return signals;
  }
}

async function upcomingNewsSignal(): Promise<Signal | null> {
  try {
    const response = await fetch(FOREX_FACTORY_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Tradox/1.0 smart-notifications",
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const rows = (await response.json().catch(() => [])) as ForexFactoryEvent[];
    if (!Array.isArray(rows)) return null;

    const now = Date.now();
    const event = rows
      .filter((item) => item.impact === "High" && item.title && item.date)
      .map((item) => ({ item, date: new Date(String(item.date)) }))
      .filter(({ date }) => !Number.isNaN(date.getTime()))
      .map(({ item, date }) => ({ item, date, minutes: Math.round((date.getTime() - now) / 60000) }))
      .filter(({ minutes }) => minutes >= 0 && minutes <= 90)
      .sort((left, right) => left.minutes - right.minutes)[0];

    if (!event) return null;
    const currency = String(event.item.country || "FX").toUpperCase();
    const eventId = `${event.date.toISOString()}-${currency}-${event.item.title}`;
    return {
      dedupeKey: `ai_news:${eventId}`,
      type: "ai_market_news",
      category: "market",
      priority: "high",
      accountId: null,
      message: `High-impact ${currency} news: ${event.item.title} at ${nyTime(event.date)} NY, in about ${event.minutes} minutes. Review exposure and your news rules.`,
    };
  } catch {
    return null;
  }
}

function accountSignals(account: AccountRow, trades: JournalRow[], now: Date) {
  const signals: Signal[] = [];
  const today = nyDateKey(now);
  const todayTrades = trades.filter((trade) => {
    const date = tradeDate(trade);
    return date ? nyDateKey(date) === today : false;
  });
  const todayPnl = todayTrades.reduce((sum, trade) => sum + numberValue(trade.pnl), 0);
  const initialBalance = numberValue(account.initial_balance);
  const dailyLimit = limitAmount(account.daily_drawdown, initialBalance);

  if (dailyLimit > 0 && todayPnl < 0) {
    const used = Math.round((Math.abs(todayPnl) / dailyLimit) * 100);
    if (used >= 60) {
      signals.push({
        dedupeKey: `ai_risk:${account.id}:${today}`,
        type: "ai_risk_warning",
        category: "risk",
        priority: used >= 85 ? "high" : "medium",
        accountId: account.id,
        message: `${account.name}: today's loss is ${money(Math.abs(todayPnl))}, about ${used}% of the configured daily drawdown limit. Consider stopping and reviewing risk before another entry.`,
      });
    }
  }

  if (todayTrades.length >= 5) {
    signals.push({
      dedupeKey: `ai_overtrading:${account.id}:${today}`,
      type: "ai_overtrading",
      category: "psychology",
      priority: "medium",
      accountId: account.id,
      message: `${account.name}: ${todayTrades.length} trades were recorded today. That is an overtrading warning; pause and check whether every entry matched the plan.`,
    });
  }

  const planViolations = todayTrades.filter((trade) => trade.following_plan === false).length;
  if (planViolations >= 2) {
    signals.push({
      dedupeKey: `ai_plan:${account.id}:${today}`,
      type: "ai_plan_violation",
      category: "psychology",
      priority: "medium",
      accountId: account.id,
      message: `${account.name}: ${planViolations} trades today were marked as outside the trading plan. Review the trigger and avoid repeating the same condition.`,
    });
  }

  const chronological = [...todayTrades]
    .map((trade) => ({ trade, time: tradeTimestamp(trade) }))
    .filter((item): item is { trade: JournalRow; time: Date } => Boolean(item.time))
    .sort((left, right) => left.time.getTime() - right.time.getTime());

  for (let index = 1; index < chronological.length; index += 1) {
    const previous = chronological[index - 1];
    const current = chronological[index];
    const minutes = (current.time.getTime() - previous.time.getTime()) / 60000;
    const previousRisk = numberValue(previous.trade.risk_amount);
    const currentRisk = numberValue(current.trade.risk_amount);
    const riskRaised = previousRisk > 0 && currentRisk > previousRisk * 1.1;
    if (numberValue(previous.trade.pnl) < 0 && minutes >= 0 && minutes <= 30 && (minutes <= 15 || riskRaised)) {
      signals.push({
        dedupeKey: `ai_revenge:${account.id}:${today}`,
        type: "ai_revenge_trading",
        category: "psychology",
        priority: "high",
        accountId: account.id,
        message: `${account.name}: a new trade was recorded ${Math.max(1, Math.round(minutes))} minutes after a loss${riskRaised ? " with higher risk" : ""}. This resembles revenge-trading behavior; pause and review the entry.`,
      });
      break;
    }
  }

  const lastSevenDays = trades.filter((trade) => {
    const date = tradeDate(trade);
    return date ? now.getTime() - date.getTime() <= 7 * 86400000 : false;
  });
  if (lastSevenDays.length >= 5) {
    const pnl = lastSevenDays.map((trade) => numberValue(trade.pnl));
    const wins = pnl.filter((value) => value > 0).length;
    const losses = pnl.filter((value) => value < 0).length;
    const reviewed = lastSevenDays.filter((trade) => typeof trade.following_plan === "boolean");
    const followed = reviewed.filter((trade) => trade.following_plan).length;
    const mistakes = new Map<string, number>();
    lastSevenDays.forEach((trade) => {
      const name = trade.mistake_type?.trim();
      if (name) mistakes.set(name, (mistakes.get(name) || 0) + 1);
    });
    const topMistake = [...mistakes.entries()].sort((a, b) => b[1] - a[1])[0];
    const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0;
    const planRate = reviewed.length ? Math.round((followed / reviewed.length) * 100) : null;
    signals.push({
      dedupeKey: `ai_weekly:${account.id}:${weekKey(now)}`,
      type: "ai_weekly_review",
      category: "performance",
      priority: "insight",
      accountId: account.id,
      message: `${account.name} weekly review: ${lastSevenDays.length} trades, ${winRate}% win rate, ${money(pnl.reduce((sum, value) => sum + value, 0))} net P&L${planRate === null ? "" : `, ${planRate}% plan alignment`}${topMistake ? `. Most repeated mistake: ${topMistake[0]}` : ""}.`,
    });
  }

  const allPnl = trades.reduce((sum, trade) => sum + numberValue(trade.pnl), 0);
  if (initialBalance > 0) {
    const growth = (allPnl / initialBalance) * 100;
    const milestone = growth >= 10 ? 10 : growth >= 5 ? 5 : 0;
    if (milestone) {
      signals.push({
        dedupeKey: `ai_milestone:${account.id}:${milestone}`,
        type: "ai_milestone",
        category: "achievement",
        priority: "insight",
        accountId: account.id,
        message: `${account.name} reached a new journal milestone: cumulative closed-trade P&L is above ${milestone}% of the initial balance. Keep the same risk discipline.`,
      });
    }
  }

  return signals;
}

async function existingKeys(
  auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>,
  keys: string[],
) {
  if (!keys.length) return new Set<string>();
  const { data, error } = await auth.supabase
    .from("notifications")
    .select("dedupe_key")
    .eq("user_id", auth.user.id)
    .in("dedupe_key", keys)
    .returns<Array<{ dedupe_key: string | null }>>();

  if (error) {
    if (missingSmartColumns(error.message)) return null;
    throw new Error(error.message);
  }
  return new Set((data ?? []).map((row) => row.dedupe_key).filter(Boolean) as string[]);
}

async function insertSignal(
  auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>,
  signal: Signal,
) {
  const payload = {
    user_id: auth.user.id,
    actor_id: null,
    type: signal.type,
    message: signal.message,
    is_read: false,
    entity_id: signal.accountId,
    entity_type: signal.accountId ? "prop_account" : "market_event",
    dedupe_key: signal.dedupeKey,
    metadata: {
      source: "tradox_ai",
      category: signal.category,
      priority: signal.priority,
      accountId: signal.accountId,
      model: process.env.GROQ_API_KEY ? MODEL : null,
    },
  };

  const first = await auth.supabase.from("notifications").insert(payload);
  if (!first.error) return true;
  if (first.error.code === "23505") return false;
  if (!missingSmartColumns(first.error.message)) throw new Error(first.error.message);

  const since = new Date(Date.now() - 8 * 86400000).toISOString();
  const { data: recent, error: recentError } = await auth.supabase
    .from("notifications")
    .select("id, type, message")
    .eq("user_id", auth.user.id)
    .eq("type", signal.type)
    .gte("created_at", since)
    .returns<Array<{ id: string; type: string; message: string }>>();
  if (recentError) throw new Error(recentError.message);
  if ((recent ?? []).some((item) => item.message === signal.message)) return false;

  const fallback = await auth.supabase.from("notifications").insert({
    user_id: auth.user.id,
    actor_id: null,
    type: signal.type,
    message: signal.message,
    is_read: false,
  });
  if (fallback.error) throw new Error(fallback.error.message);
  return true;
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const accessError = await requireProAi(auth);
  if (accessError) return accessError;

  const nowMs = Date.now();
  const previous = syncTimes.get(auth.user.id) ?? 0;
  if (nowMs - previous < SYNC_COOLDOWN_MS) {
    return Response.json({ created: 0, skipped: true });
  }
  syncTimes.set(auth.user.id, nowMs);

  try {
    const { data: accounts, error: accountError } = await auth.supabase
      .from("prop_accounts")
      .select("id, name, initial_balance, daily_drawdown, max_drawdown")
      .eq("user_id", auth.user.id)
      .returns<AccountRow[]>();
    if (accountError) return serverError(accountError.message);

    const accountIds = (accounts ?? []).map((account) => account.id);
    const { data: entries, error: entryError } = accountIds.length
      ? await auth.supabase
          .from("journal_entries")
          .select("*")
          .eq("user_id", auth.user.id)
          .in("prop_account_id", accountIds)
          .order("traded_at", { ascending: false })
          .limit(300)
          .returns<JournalRow[]>()
      : { data: [] as JournalRow[], error: null };
    if (entryError) return serverError(entryError.message);

    const now = new Date();
    let signals = (accounts ?? []).flatMap((account) =>
      accountSignals(
        account,
        (entries ?? []).filter((entry) => entry.prop_account_id === account.id),
        now,
      ),
    );

    const newsSignal = await upcomingNewsSignal();
    if (newsSignal) signals.push(newsSignal);

    signals = signals.slice(0, 12);
    const keys = await existingKeys(auth, signals.map((signal) => signal.dedupeKey));
    if (keys) signals = signals.filter((signal) => !keys.has(signal.dedupeKey));
    signals = signals.slice(0, 5);
    signals = await rewriteSignals(signals);

    let created = 0;
    for (const signal of signals) {
      if (await insertSignal(auth, signal)) created += 1;
    }

    return Response.json({ created, evaluated: (accounts ?? []).length, model: process.env.GROQ_API_KEY ? MODEL : null });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Tradox AI notification sync failed.");
  }
}
