import type { Metadata } from "next";

import { JournalRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Journal | Tradox",
};

export default function JournalPage() {
  return <JournalRoute />;
}
