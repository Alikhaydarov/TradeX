"use client";

import { Check, LoaderCircle, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLoader } from "./app-loader";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";
import type { AdminUser } from "./types";

export function AdminPanel({ onLogin }: { onLogin: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiRequest<{ users: AdminUser[] }>("/api/admin/users")
      .then((response) => {
        if (!active) return;
        setUsers(response.users);
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
      `${user.fullName} ${user.username}`.toLowerCase().includes(value),
    );
  }, [query, users]);

  const toggleVerification = async (target: AdminUser) => {
    setSavingId(target.id);
    setError(null);

    const nextValue = !target.isVerified;
    try {
      await apiRequest<{ success: boolean }>("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: target.id, isVerified: nextValue }),
      });

      setUsers((current) =>
        current.map((user) =>
          user.id === target.id ? { ...user, isVerified: nextValue } : user,
        ),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Galochka o'zgarmadi.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 flex items-center border-b border-white/8 bg-[#171717]/45 px-5 py-4 backdrop-blur-2xl">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-zinc-300/70">Admin panel</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Userlarni boshqarish</h1>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[10px] font-bold text-zinc-300">
          <ShieldCheck size={12} /> ADMIN
        </span>
      </header>

      <div className="p-4 md:p-5">
        {error && <div className="mb-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 backdrop-blur-xl">{error}</div>}

        {loading ? (
          <AppLoader label="Admin ma'lumotlari yuklanmoqda" />
        ) : (
          <section className="rounded-[28px] border border-white/10 bg-white/[.04] p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-black">Ro&apos;yxatdan o&apos;tgan userlar</h2>
                <p className="mt-1 text-xs text-slate-500">Galochka berilgan userlar verified bo&apos;lib ko&apos;rinadi.</p>
              </div>
              <div className="relative sm:ml-auto sm:w-80">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-500" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="User izlash"
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {filteredUsers.map((target) => (
                <div key={target.id} className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-black/10 p-3">
                  <TraderAvatar name={target.fullName} value={target.avatarUrl} className="h-11 w-11 rounded-2xl text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="truncate text-sm">{target.fullName}</strong>
                      {target.isVerified && <VerifiedBadge size={14} />}
                      {target.isAdmin && <span className="rounded-full bg-white/[.06] px-2 py-0.5 text-[9px] font-black text-zinc-300">ADMIN</span>}
                    </div>
                    <p className="truncate text-[11px] text-slate-500">@{target.username}</p>
                  </div>
                  <Button
                    onClick={() => void toggleVerification(target)}
                    disabled={savingId === target.id}
                    className={`rounded-2xl px-3 text-xs font-bold ${target.isVerified ? "bg-white text-black hover:bg-zinc-200" : "bg-white/[.06] text-slate-200 hover:bg-white/[.1]"}`}
                  >
                    {savingId === target.id ? (
                      <LoaderCircle className="animate-spin" size={14} />
                    ) : target.isVerified ? (
                      <Check size={14} />
                    ) : (
                      <X size={14} />
                    )}
                    {target.isVerified ? "Verified" : "Galochka berish"}
                  </Button>
                </div>
              ))}

              {!filteredUsers.length && (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
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
