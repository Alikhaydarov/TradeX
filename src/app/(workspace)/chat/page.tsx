import type { Metadata } from "next";

import { FeedRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Feed | Tradox",
};

export default function ChatPage() {
  return <FeedRoute />;
}
