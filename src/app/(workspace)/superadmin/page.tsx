import type { Metadata } from "next";

import { AdminRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Admin | Tradoxy",
};

export default function SuperAdminPage() {
  return <AdminRouteContent />;
}
