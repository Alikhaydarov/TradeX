import { calculateTraderoxStats } from "./stats";
import { runTraderoxRules } from "./rules";
import type { TraderoxAccount, TraderoxReport, TraderoxTrade } from "./types";

const penalties: Record<string, number> = {
  overtrading: 15,
  revenge_trading: 20,
  risk_increase_after_loss: 20,
  missing_setup_notes: 10,
  daily_loss_limit: 20,
  loss_streak: 15,
};

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

  return { disciplineScore, stats, findings, alerts, recommendations };
}
