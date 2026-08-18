import type { Metadata } from "next";

import { HomeRouteContent } from "@/components/routes/home-route-content";

export const metadata: Metadata = {
  title: "Home | Tradoxy",
};

export default function Home() {
  return <HomeRouteContent />;
}
