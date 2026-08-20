import type { PropAccount } from "../types";

export type AccountRow = {
  id: string;
  name: string;
  account_type?: "prop" | "real" | null;
  firm: string;
  prop_site?: string | null;
  prop_login?: string | null;
  import_source?: PropAccount["importSource"] | null;
  platform?: string | null;
  phase: string;
  market_type: string;
  account_size: string;
  initial_balance: string;
  profit_target: string;
  max_drawdown: string;
  daily_drawdown: string;
  start_date: string;
  status: PropAccount["status"];
};

export function accountFromRow(row: AccountRow): PropAccount {
  return {
    id: row.id,
    name: row.name,
    accountType: row.account_type || "prop",
    firm: row.firm,
    propSite: row.prop_site || "",
    propLogin: row.prop_login || "",
    importSource: row.import_source || "manual",
    platform: row.platform || "mt5",
    phase: row.phase,
    marketType: row.market_type,
    accountSize: Number(row.account_size || 0),
    initialBalance: Number(row.initial_balance || 0),
    profitTarget: Number(row.profit_target || 0),
    maxDrawdown: Number(row.max_drawdown || 0),
    dailyDrawdown: Number(row.daily_drawdown || 0),
    startDate: row.start_date,
    status: row.status,
  };
}
