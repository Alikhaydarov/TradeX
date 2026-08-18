import type { Metadata } from "next";

import { HomeRouteContent } from "@/components/routes/home-route-content";

export const metadata: Metadata = {
  title: "Home | TradeWay",
};

export default function Home() {
  return <HomeRouteContent />;
}
