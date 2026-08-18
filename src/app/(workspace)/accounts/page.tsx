import type { Metadata } from "next";

import { AccountsRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Accounts | Tradoxy",
};

export default function AccountsPage() {
  return <AccountsRouteContent />;
}
