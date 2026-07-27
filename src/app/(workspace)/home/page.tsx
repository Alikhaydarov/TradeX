import type { Metadata } from "next";

import { FeedRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Home | Tradox",
};

export default function HomePage() {
  return <FeedRoute />;
}
