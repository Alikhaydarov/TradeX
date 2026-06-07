import { TradingApp } from "@/components/trading-app";
import { getInitialAuth } from "@/lib/server/get-initial-auth";

export default async function BacktestPage() {
  const auth = await getInitialAuth();
  return <TradingApp {...auth} />;
}
