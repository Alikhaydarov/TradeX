"use client";

import dynamic from "next/dynamic";

import { FreeUserStart } from "../free-user-start";
import { WorkspaceSectionSkeleton } from "../workspace-section-skeleton";

const FeedV3 = dynamic(
  () => import("../feed/feed-page").then((module) => module.FeedPage),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

function openLogin() {
  window.dispatchEvent(
    new CustomEvent("tradeup:open-auth", { detail: { mode: "login" } }),
  );
}

export function HomeRouteContent() {
  return (
    <FreeUserStart>
      <FeedV3 onLogin={openLogin} />
    </FreeUserStart>
  );
}
