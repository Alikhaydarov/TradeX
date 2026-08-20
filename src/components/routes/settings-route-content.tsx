"use client";

import { AccountSettings } from "../account-settings";

function openLogin() {
  window.dispatchEvent(
    new CustomEvent("tradeup:open-auth", { detail: { mode: "login" } }),
  );
}

export function SettingsRouteContent() {
  return <AccountSettings onLogin={openLogin} />;
}
