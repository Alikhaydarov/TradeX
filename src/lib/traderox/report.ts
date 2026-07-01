import { calculateTraderoxStats } from "./stats";
import { runTraderoxRules } from "./rules";
import type { TraderoxAccount, TraderoxCoachInsight, TraderoxFinding, TraderoxReport, TraderoxTrade } from "./types";

const penalties: Record<string, number> = {
  overtrading: 15,
  revenge_trading: 20,
  risk_increase_after_loss: 20,
  missing_setup_notes: 10,
  daily_loss_limit: 20,
  loss_streak: 15,
};

function sortByCloseTime(trades: TraderoxTrade[]) {
  return [...trades].sort((a, b) => {
    const left = new Date(a.closedAt || a.openedAt || 0).getTime();
    const right = new Date(b.closedAt || b.openedAt || 0).getTime();
    return left - right;
  });
}

function money(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function topFinding(findings: TraderoxFinding[]) {
  return findings.find((finding) => finding.severity === "danger")
    || findings.find((finding) => finding.severity === "warning")
    || findings[0]
    || null;
}

function buildCoachInsight(
  trades: TraderoxTrade[],
  disciplineScore: number,
  findings: TraderoxFinding[],
  recommendations: string[],
): TraderoxCoachInsight {
  const ordered = sortByCloseTime(trades);
  const latest = ordered.at(-1) || null;
  const mostImportant = topFinding(findings);
  const isProtectedMode = disciplineScore < 60 || findings.some((finding) => finding.severity === "danger");
  const isPushMode = disciplineScore >= 80 && !findings.some((finding) => finding.severity === "danger");

  const mood: TraderoxCoachInsight["mood"] = isProtectedMode ? "protect" : isPushMode ? "push" : "neutral";
  const title = isProtectedMode
    ? "Riskni himoya qilamiz"
    : isPushMode
      ? "Discipline yaxshi, modelni davom ettir"
      : "Bugungi focus: sifatli execution";

  const recentTradeFeedback = latest
    ? latest.netPnl >= 0
      ? `Oxirgi trade ${latest.symbol} bo'yicha ${money(latest.netPnl)} bilan yopildi. Foydadan keyin riskni oshirmasdan, shu modelni takrorla.`
      : `Oxirgi trade ${latest.symbol} bo'yicha ${money(latest.netPnl)} bilan yopildi. Keyingi trade oldidan setup va riskni qayta tekshir.`
    : "Hali trade history yetarli emas. Birinchi yopilgan tradelar kelgandan keyin coach aniqroq maslahat beradi.";

  const summary = mostImportant
    ? `${mostImportant.title}: ${mostImportant.message}`
    : "Jiddiy discipline muammosi topilmadi. Asosiy vazifa: modeldan chetga chiqmaslik.";

  const nextAction = mood === "protect"
    ? "Keyingi trade oldidan 10 daqiqa pause qil, setup screenshotini tekshir va riskni kamaytir."
    : mood === "push"
      ? "Faqat A+ setup bo'lsa davom et. Riskni oshirma, jarayonni takrorla."
      : "Bugun maksimum 1-2 ta sifatli setup tanla va har trade uchun sabab yoz.";

  const actionItems = Array.from(new Set([
    ...recommendations,
    nextAction,
  ])).slice(0, 5);

  return {
    name: "Traderox AI",
    title,
    summary,
    mood,
    nextAction,
    recentTradeFeedback,
    actionItems,
  };
}

export function buildTraderoxReport(
  trades: TraderoxTrade[],
  account: TraderoxAccount = {},
): TraderoxReport {
  const stats = calculateTraderoxStats(trades);
  const findings = runTraderoxRules(trades, stats, account);
  const penalty = findings.reduce((sum, finding) => sum + (penalties[finding.type] || 5), 0);
  const disciplineScore = Math.max(0, Math.min(100, 100 - penalty));
  const alerts = findings.filter((finding) => finding.severity !== "info");

  const recommendations = [
    "2 ta ketma-ket lossdan keyin tradingni to'xtating.",
    "Har trade uchun setup nomini yozing.",
    "Risk foizingizni doimiy saqlang.",
  ];

  if (findings.some((finding) => finding.type === "overtrading")) {
    recommendations.unshift("Kunlik maksimal trade limit belgilang.");
  }
  if (findings.some((finding) => finding.type === "daily_loss_limit")) {
    recommendations.unshift("Daily loss limitga yaqinlashganda terminalni yoping.");
  }

  const coach = buildCoachInsight(trades, disciplineScore, findings, recommendations);

  return { disciplineScore, stats, findings, alerts, recommendations, coach };
}
