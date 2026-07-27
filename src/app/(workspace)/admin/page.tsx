import type { Metadata } from "next";

import { AdminRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Admin | Tradox",
};

export default function AdminPage() {
  return <AdminRoute />;
}
