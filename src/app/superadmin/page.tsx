import type { Metadata } from "next";

import { AdminRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Super Admin | Tradox",
};

export default function SuperAdminPage() {
  return <AdminRoute />;
}
