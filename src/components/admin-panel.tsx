"use client";

import { BarChart3, Check, LoaderCircle, Newspaper, Search, ShieldCheck, Sparkles, Star, UserCog, Users, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLoader } from "./app-loader";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";
import type { AdminUser } from "./types";

type AdminPlan = AdminUser["plan"];

const PLAN_OPTIONS: Array<{ value: AdminPlan; label: string; description: string }> = [
  { value: "free", label: "Free", description: "Basic app access only" },
  { value: "standard", label: "Standard", description: "Verified + AI + MT5 sync" },
  { value: "pro", label: "Pro", description: "Premium tools + future pro stack" },
];

function formatDate(value: string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isPremiumPlan(plan: AdminPlan) {
  return plan === "standard" || plan === "pro";
}

export function AdminPanel({ onLogin }: { onLogin: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { plan: AdminPlan; isVerified: boolean; isAdmin: boolean }>>({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiRequest<{ users: AdminUser[] }>("/api/admin/users")
      .then((response) => {
        if (!active) return;
        setUsers(response.users);
        setDrafts(
          Object.fromEntries(
            response.users.map((user) => [
              user.id,
              {
                plan: user.plan,
                isVerified: user.isVerified,
                isAdmin: user.isAdmin,
              },
            ]),
          ),
        );
      })
      .catch((nextError: Error) => {
        if (!active) return;
        if (nextError.message.includes("Google")) onLogin();
        setError(nextError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onLogin]);

  const filteredUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) =>
      `${user.fullName} ${user.username} ${user.email ?? ""} ${user.plan}`.toLowerCase().includes(value),
    );
  }, [query, users]);

  const summary = useMemo(() => {
    const premiumUsers = users.filter((user) => isPremiumPlan(user.plan)).length;
    const verifiedUsers = users.filter((user) => user.isVerified && isPremiumPlan(user.plan)).length;
    const admins = users.filter((user) => user.isAdmin).length;
    const linkedAccounts = users.reduce((total, user) => total + user.accountsCount, 0);

    return {
      totalUsers: users.length,
      premiumUsers,
      verifiedUsers,
      admins,
      linkedAccounts,
    };
  }, [users]);

  const updateDraft = (
    userId: string,
    patch: Partial<{ plan: AdminPlan; isVerified: boolean; isAdmin: boolean }>,
  ) => {
    setSavedId((current) => (current === userId ? null : current));
    setDrafts((current) => ({
      ...current,
      [userId]: {
        plan: current[userId]?.plan ?? "free",
        isVerified: current[userId]?.isVerified ?? false,
        isAdmin: current[userId]?.isAdmin ?? false,
        ...patch,
      },
    }));
  };

  const saveAccess = async (target: AdminUser) => {
    const draft = drafts[target.id] ?? {
      plan: target.plan,
      isVerified: target.isVerified,
      isAdmin: target.isAdmin,
    };
    const nextPlan = draft.plan;
    const nextVerified = isPremiumPlan(nextPlan) ? draft.isVerified : false;

    setSavingId(target.id);
    setError(null);

    try {
      await apiRequest<{ success: boolean }>("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: target.id,
          plan: nextPlan,
          isVerified: nextVerified,
          premiumUntil: target.premiumUntil,
          isAdmin: draft.isAdmin,
        }),
      });

      setUsers((current) =>
        current.map((user) =>
          user.id === target.id
            ? {
                ...user,
                plan: nextPlan,
                isVerified: nextVerified,
                isAdmin: draft.isAdmin,
                aiEnabled: isPremiumPlan(nextPlan),
                traderoxEnabled: isPremiumPlan(nextPlan),
                autoSyncEnabled: isPremiumPlan(nextPlan),
              }
            : user,
        ),
      );

      setDrafts((current) => ({
        ...current,
        [target.id]: {
          plan: nextPlan,
          isVerified: nextVerified,
          isAdmin: draft.isAdmin,
        },
      }));
      setSavedId(target.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Access update failed.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 flex items-center border-b border-white/8 bg-[#111111]/95 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-zinc-500">Superadmin</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">TradeWay access console</h1>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-200">
          <ShieldCheck size={12} /> ROOT ACCESS
        </span>
      </header>

      <div className="p-2.5 sm:p-4 md:p-5">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <AppLoader label="Loading superadmin directory" />
        ) : (
          <section className="rounded-3xl border border-white/8 bg-[#141414] p-3 shadow-2xl shadow-black/25 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-black text-white">Users, plans and roles</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Manage premium access, verified badge and admin rights from one place.
                </p>
              </div>
              <div className="relative sm:ml-auto sm:w-80">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-zinc-500" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search user or email" className="h-11 pl-9" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Users", value: summary.totalUsers, icon: Users },
                { label: "Premium", value: summary.premiumUsers, icon: Sparkles },
                { label: "Verified", value: summary.verifiedUsers, icon: ShieldCheck },
                { label: "Admins", value: summary.admins, icon: UserCog },
                { label: "Linked accounts", value: summary.linkedAccounts, icon: BarChart3 },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-[#0d0d0d] px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-zinc-500">
                    <item.icon size={13} />
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {filteredUsers.map((target) => {
                const draft = drafts[target.id] ?? {
                  plan: target.plan,
                  isVerified: target.isVerified,
                  isAdmin: target.isAdmin,
                };
                const premiumEnabled = isPremiumPlan(draft.plan);
                const hasChanges =
                  draft.plan !== target.plan ||
                  draft.isVerified !== target.isVerified ||
                  draft.isAdmin !== target.isAdmin;

                return (
                  <div
                    key={target.id}
                    className="grid gap-4 rounded-[28px] border border-white/8 bg-[#0d0d0d] p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,.9fr)_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <TraderAvatar name={target.fullName} value={target.avatarUrl} className="h-12 w-12 rounded-2xl text-xs" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="truncate text-sm text-white">{target.fullName}</strong>
                            {premiumEnabled && draft.isVerified ? <VerifiedBadge size={14} /> : null}
                            {draft.isAdmin ? (
                              <span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                                ADMIN
                              </span>
                            ) : null}
                            <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                              {PLAN_OPTIONS.find((item) => item.value === draft.plan)?.label}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-zinc-500">@{target.username}</p>
                          <p className="truncate text-[11px] text-zinc-600">{target.email || "Email not available"}</p>

                          <div className="mt-3 grid gap-2 text-[11px] text-zinc-400 sm:grid-cols-2 xl:grid-cols-3">
                            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1">
                              Expires: {formatDate(target.premiumUntil)}
                            </span>
                            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1">
                              Last sign in: {formatDateTime(target.lastSignInAt)}
                            </span>
                            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1">
                              Joined: {formatDate(target.createdAt)}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 ${target.aiEnabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-white/8 bg-white/[.03] text-zinc-500"}`}>
                              <Sparkles className="mr-1 inline size-3" /> AI {target.aiEnabled ? "on" : "off"}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 ${target.autoSyncEnabled ? "border-sky-500/20 bg-sky-500/10 text-sky-200" : "border-white/8 bg-white/[.03] text-zinc-500"}`}>
                              <Zap className="mr-1 inline size-3" /> Auto Sync {target.autoSyncEnabled ? "on" : "off"}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 ${target.traderoxEnabled ? "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200" : "border-white/8 bg-white/[.03] text-zinc-500"}`}>
                              <Star className="mr-1 inline size-3" /> Coach {target.traderoxEnabled ? "on" : "off"}
                            </span>
                            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1">
                              <BarChart3 className="mr-1 inline size-3" /> Accounts {target.accountsCount}
                            </span>
                            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1">
                              <Check className="mr-1 inline size-3" /> Trades {target.journalEntriesCount}
                            </span>
                            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1">
                              <Newspaper className="mr-1 inline size-3" /> Posts {target.postsCount}
                            </span>
                            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1">
                              Subscription: {target.subscriptionStatus || "none"}
                            </span>
                            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1">
                              Provider: {target.subscriptionProvider || "manual"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 rounded-[24px] border border-white/8 bg-white/[.02] p-3">
                      <div className="grid gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500">Plan</span>
                        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/8 bg-black/25 p-1.5">
                          {PLAN_OPTIONS.map((option) => {
                            const selected = draft.plan === option.value;
                            return (
                              <Button
                                key={option.value}
                                type="button"
                                onClick={() => updateDraft(target.id, {
                                  plan: option.value,
                                  isVerified: option.value !== "free",
                                })}
                                className={`h-10 rounded-xl px-2 text-xs font-bold ${
                                  selected
                                    ? option.value === "pro"
                                      ? "bg-amber-300 text-black hover:bg-amber-200"
                                      : option.value === "standard"
                                        ? "bg-sky-300 text-black hover:bg-sky-200"
                                        : "bg-white text-black hover:bg-zinc-200"
                                    : "bg-transparent text-zinc-500 hover:bg-white/[.06] hover:text-zinc-200"
                                }`}
                              >
                                {selected ? <Check size={14} /> : null}
                                {option.label}
                              </Button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          {PLAN_OPTIONS.find((item) => item.value === draft.plan)?.description}
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500">Verified badge</span>
                        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-black/20 p-1">
                          <Button
                            type="button"
                            onClick={() => updateDraft(target.id, { isVerified: true })}
                            disabled={!premiumEnabled}
                            className={`h-10 flex-1 rounded-xl text-xs font-bold ${
                              draft.isVerified && premiumEnabled
                                ? "bg-white text-black hover:bg-zinc-200"
                                : "bg-transparent text-zinc-400 hover:bg-white/[.06]"
                            }`}
                          >
                            {draft.isVerified && premiumEnabled ? <Check size={14} /> : null}
                            Verified
                          </Button>
                          <Button
                            type="button"
                            onClick={() => updateDraft(target.id, { isVerified: false })}
                            className={`h-10 flex-1 rounded-xl text-xs font-bold ${
                              !draft.isVerified || !premiumEnabled
                                ? "bg-white/[.06] text-zinc-200 hover:bg-white/[.09]"
                                : "bg-transparent text-zinc-400 hover:bg-white/[.06]"
                            }`}
                          >
                            Hidden
                          </Button>
                        </div>
                        {!premiumEnabled ? (
                          <p className="text-[11px] text-amber-300/80">Free plan uchun badge avtomatik o&apos;chadi.</p>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500">Role</span>
                        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-black/20 p-1">
                          <Button
                            type="button"
                            onClick={() => updateDraft(target.id, { isAdmin: false })}
                            className={`h-10 flex-1 rounded-xl text-xs font-bold ${
                              !draft.isAdmin ? "bg-white/[.06] text-zinc-200 hover:bg-white/[.09]" : "bg-transparent text-zinc-400 hover:bg-white/[.06]"
                            }`}
                          >
                            Member
                          </Button>
                          <Button
                            type="button"
                            onClick={() => updateDraft(target.id, { isAdmin: true })}
                            className={`h-10 flex-1 rounded-xl text-xs font-bold ${
                              draft.isAdmin ? "bg-white text-black hover:bg-zinc-200" : "bg-transparent text-zinc-400 hover:bg-white/[.06]"
                            }`}
                          >
                            <UserCog size={14} /> Admin
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        onClick={() => void saveAccess(target)}
                        disabled={savingId === target.id || !hasChanges}
                        className="h-11 min-w-[136px] rounded-2xl bg-white text-black hover:bg-zinc-200"
                      >
                        {savingId === target.id ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}
                        {savedId === target.id && !hasChanges ? "Saved" : "Save access"}
                      </Button>
                    </div>
                  </div>
                );
              })}

              {!filteredUsers.length ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
                  No users found.
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
