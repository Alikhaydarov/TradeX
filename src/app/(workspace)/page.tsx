import type { Metadata } from "next";

import { HomeRouteContent } from "@/components/routes/home-route-content";

export const metadata: Metadata = {
  title: "Home | Tradox",
};

export default function Home() {
  return <HomeRouteContent />;
}
