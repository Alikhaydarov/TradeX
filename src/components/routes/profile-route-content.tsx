"use client";

import { ProfilePage } from "../profile/profile-page";

function openLogin() {
  window.dispatchEvent(
    new CustomEvent("tradeup:open-auth", { detail: { mode: "login" } }),
  );
}

export function ProfileRouteContent({ username }: { username?: string }) {
  return <ProfilePage onLogin={openLogin} profileUsername={username} />;
}
