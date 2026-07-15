"use client";

import { Check, LoaderCircle, Search, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLoader } from "./app-loader";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";
import type { AdminUser } from "./types";

type AdminPlan = AdminUser["plan"];

const PLAN_OPTIONS: Array<{
  value: AdminPlan;
  label: string;
  description: string;
}> = [
  { value: "free", label: "Free", description: "Basic app only" },
  { value: "standard", label: "Standard", description: "Premium access + verified" },
  { value: "pro", label: "Pro", description: "Premium access + advanced tools" },
  { value: "premium", label: "Premium", description: "Full premium unlock" },
];

function formatDate(value: string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function isPremiumPlan(plan: AdminPlan) {
  return plan === "standard" || plan === "pro" || plan === "premium";
}

export function AdminPanel({ onLogin }: { onLogin: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { plan: AdminPlan; isVerified: boolean }>>({});

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
      `${user.fullName} ${user.username} ${user.plan}`.toLowerCase().includes(value),
    );
  }, [query, users]);

  const updateDraft = (userId: string, patch: Partial<{ plan: AdminPlan; isVerified: boolean }>) => {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        plan: current[userId]?.plan ?? "free",
        isVerified: current[userId]?.isVerified ?? false,
        ...patch,
      },
    }));
  };

  const saveAccess = async (target: AdminUser) => {
    const draft = drafts[target.id] ?? { plan: target.plan, isVerified: target.isVerified };
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
        }),
      });

      setUsers((current) =>
        current.map((user) =>
          user.id === target.id
            ? {
                ...user,
                plan: nextPlan,
                isVerified: nextVerified,
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
        },
      }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Premium access yangilanmadi.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 flex items-center border-b border-white/8 bg-[#111111]/95 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-zinc-500">Admin panel</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Premium access manager</h1>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-200">
          <ShieldCheck size={12} /> TRADEWAY ADMIN
        </span>
      </header>

      <div className="p-2.5 sm:p-4 md:p-5">
        {error && (
          <div className="mb-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <AppLoader label="Admin access data loading" />
        ) : (
          <section className="rounded-3xl border border-white/8 bg-[#141414] p-3 shadow-2xl shadow-black/25 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-black text-white">Users and premium plans</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Free, Standard, Pro yoki Premium rejasini shu yerda bitta joydan boshqaramiz.
                </p>
              </div>
              <div className="relative sm:ml-auto sm:w-80">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-zinc-500" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search user" className="h-11 pl-9" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {filteredUsers.map((target) => {
                const draft = drafts[target.id] ?? { plan: target.plan, isVerified: target.isVerified };
                const premiumEnabled = isPremiumPlan(draft.plan);
                const hasChanges = draft.plan !== target.plan || draft.isVerified !== target.isVerified;

                return (
                  <div
                    key={target.id}
                    className="grid gap-4 rounded-[28px] border border-white/8 bg-[#0d0d0d] p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <TraderAvatar name={target.fullName} value={target.avatarUrl} className="h-12 w-12 rounded-2xl text-xs" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="truncate text-sm text-white">{target.fullName}</strong>
                            {premiumEnabled && draft.isVerified && <VerifiedBadge size={14} />}
                            {target.isAdmin && (
                              <span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                                ADMIN
                              </span>
                            )}
                            <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                              {PLAN_OPTIONS.find((item) => item.value === draft.plan)?.label}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-zinc-500">@{target.username}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1">
                              Expires: {formatDate(target.premiumUntil)}
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
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[.02] p-3">
                      <div className="grid gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500">Plan</span>
                        <Select value={draft.plan} onValueChange={(value) => updateDraft(target.id, { plan: value as AdminPlan })}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        {!premiumEnabled && <p className="text-[11px] text-amber-300/80">Free reja uchun badge avtomatik o‘chadi.</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        onClick={() => void saveAccess(target)}
                        disabled={savingId === target.id || !hasChanges}
                        className="h-11 min-w-[132px] rounded-2xl bg-white text-black hover:bg-zinc-200"
                      >
                        {savingId === target.id ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}
                        Save access
                      </Button>
                    </div>
                  </div>
                );
              })}

              {!filteredUsers.length && (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
                  User topilmadi.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
