"use client";

import { AccountSettings } from "./account-settings";
import { Journal } from "./journal";

export function AccountsSection({ onLogin }: { onLogin: () => void }) {
  return <Journal onLogin={onLogin} mode="accounts" />;
}

export function DashboardSection({ onLogin }: { onLogin: () => void }) {
  return <Journal onLogin={onLogin} mode="workspace" forcedTab="overview" />;
}

export function CalendarSection({ onLogin }: { onLogin: () => void }) {
  return <Journal onLogin={onLogin} mode="workspace" forcedTab="calendar" />;
}

export function TradesSection({ onLogin }: { onLogin: () => void }) {
  return <Journal onLogin={onLogin} mode="workspace" forcedTab="trades" />;
}

export function AnalyticsSection({ onLogin }: { onLogin: () => void }) {
  return <Journal onLogin={onLogin} mode="workspace" forcedTab="analytics" />;
}

export function WorkspaceSettingsSection({ onLogin }: { onLogin: () => void }) {
  return <AccountSettings onLogin={onLogin} />;
}
