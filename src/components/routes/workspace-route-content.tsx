"use client";

import dynamic from "next/dynamic";

import { WorkspaceSectionSkeleton } from "../workspace-section-skeleton";

const Pricing = dynamic(
  () => import("../pricing").then((module) => module.Pricing),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const AdminPanel = dynamic(
  () => import("../admin-panel").then((module) => module.AdminPanel),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

function openLogin() {
  window.dispatchEvent(
    new CustomEvent("tradeup:open-auth", { detail: { mode: "login" } }),
  );
}

export function PricingRouteContent() {
  return <Pricing onLogin={openLogin} />;
}

export function AdminRouteContent() {
  return <AdminPanel onLogin={openLogin} />;
}
