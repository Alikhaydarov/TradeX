import type { Metadata } from "next";

import { AccountsRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Accounts | Tradox",
};

export default function AccountsPage() {
  return <AccountsRoute />;
}
