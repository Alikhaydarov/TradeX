"use client";

import { FreeUserStart } from "../free-user-start";
import { FeedPage } from "../feed/feed-page";

function openLogin() {
  window.dispatchEvent(
    new CustomEvent("tradeup:open-auth", { detail: { mode: "login" } }),
  );
}

export function HomeRouteContent() {
  return (
    <FreeUserStart>
      <FeedPage onLogin={openLogin} />
    </FreeUserStart>
  );
}
