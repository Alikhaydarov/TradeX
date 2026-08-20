import type { Metadata } from "next";

import { JournalAccounts } from "@/components/journal/journal-accounts";

export const metadata: Metadata = {
  title: "Accounts | Tradoxy",
};

export default function AccountsPage() {
  return <JournalAccounts />;
}
