export type TraderoxSeverity = "info" | "warning" | "danger";

export interface TraderoxTrade {
  id?: string;
  accountId?: string;
  symbol: string;
  side?: string | null;
  netPnl: number;
  grossPnl?: number | null;
  riskAmount?: number | null;
  riskPercent?: number | null;
  rr?: number | null;
  setupName?: string | null;
  sessionName?: string | null;
  openedAt?: string | Date | null;
  closedAt?: string | Date | null;
}

export interface TraderoxAccount {
  id?: string;
  dailyLossLimit?: number | null;
}

export interface TraderoxStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  bySymbol: Record<string, TraderoxGroupStats>;
  bySession: Record<string, TraderoxGroupStats>;
}

export interface TraderoxGroupStats {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
}

export interface TraderoxFinding {
  type: string;
  severity: TraderoxSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface TraderoxCoachInsight {
  name: "Traderox AI";
  title: string;
  summary: string;
  mood: "protect" | "neutral" | "push";
  nextAction: string;
  recentTradeFeedback: string;
  actionItems: string[];
}

export interface TraderoxReport {
  disciplineScore: number;
  stats: TraderoxStats;
  findings: TraderoxFinding[];
  alerts: TraderoxFinding[];
  recommendations: string[];
  coach: TraderoxCoachInsight;
}
