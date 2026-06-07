import { TradingApp } from "@/components/trading-app";
import { getInitialAuth } from "@/lib/server/get-initial-auth";

export default async function ChatPage() {
  const auth = await getInitialAuth();
  return <TradingApp {...auth} />;
}
