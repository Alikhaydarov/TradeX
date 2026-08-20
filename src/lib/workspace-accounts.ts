import type { PropAccount } from "@/components/types";

/**
 * Shape prop_accounts rows come back in. Shared so the server bootstrap and the
 * client store map rows identically - they used to have separate copies of this
 * and could drift.
 */
export type AccountRow = {
  id: string;
  name: string;
  account_type?: "prop" | "real" | null;
  firm: string;
  prop_site?: string | null;
  prop_login?: string | null;
  import_source?:
    | "manual"
    | "mt5_bridge"
    | "ctrader"
    | "tradovate"
    | "ninjatrader"
    | "official_api"
    | null;
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

export const accountFromRow = (a: AccountRow): PropAccount => ({
  id: a.id,
  name: a.name,
  accountType: a.account_type || "prop",
  firm: a.firm,
  propSite: a.prop_site || "",
  propLogin: a.prop_login || "",
  importSource: a.import_source || "manual",
  platform: a.platform || "mt5",
  phase: a.phase,
  marketType: a.market_type,
  accountSize: +a.account_size,
  initialBalance: +a.initial_balance,
  profitTarget: +a.profit_target,
  maxDrawdown: +a.max_drawdown,
  dailyDrawdown: +a.daily_drawdown,
  startDate: a.start_date,
  status: a.status,
});
