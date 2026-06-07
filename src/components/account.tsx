"use client";

import { Check, Database, LogOut, MapPin, Settings2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";
import type { Profile } from "./types";

function profileFromUser(user: NonNullable<ReturnType<typeof useAuth>["user"]>): Profile {
  const fullName = String(user.user_metadata.full_name ?? user.user_metadata.name ?? "Trader");
  return {
    id: user.id,
    username: String(user.user_metadata.user_name ?? user.email?.split("@")[0] ?? "trader"),
    fullName,
    avatarUrl: typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    bio: "",
    tradingStyle: "Price Action",
    location: "",
  };
}

export function Account({ onLogin }: { onLogin: () => void }) {
  const { user, configured, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiRequest<{ profile: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
        bio: string;
        trading_style: string;
        location: string;
      } }>("/api/profile")
      .then(({ profile: data }) => {
        setProfile({
          id: data.id,
          username: data.username,
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
          bio: data.bio,
          tradingStyle: data.trading_style,
          location: data.location,
        });
      }).catch((nextError: Error) => setError(nextError.message));
  }, [user]);

  if (!user) {
    return (
      <>
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-white/8 bg-[#0c1424]/32 px-4 backdrop-blur-2xl">
          <h1 className="text-xl font-extrabold">Account</h1>
        </header>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[.04] backdrop-blur-2xl">
            <UserRound size={36} className="text-xmuted" />
          </div>
          <h2 className="mt-6 text-2xl font-black">Profilingizni yarating</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-xmuted">
            Google orqali ro&apos;yxatdan o&apos;ting. Postlar, chat va trading profilingiz cloud&apos;da saqlanadi.
          </p>
          <button onClick={onLogin} className="mt-6 rounded-full bg-white px-7 py-3 font-bold text-black">
            Google orqali kirish
          </button>
          {!configured && <p className="mt-4 text-xs text-amber-300">Hozir demo rejim faol.</p>}
        </div>
      </>
    );
  }

  const activeProfile = profile?.id === user.id ? profile : profileFromUser(user);
  const initials = activeProfile.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2);

  const save = async () => {
    setError(null);
    try {
      await apiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(activeProfile),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Profil saqlanmadi.");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center border-b border-white/8 bg-[#0c1424]/32 px-4 backdrop-blur-2xl">
        <h1 className="text-xl font-extrabold">Account</h1>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
          <Database size={14} /> {configured ? "Node API ulangan" : "Backend offline"}
        </span>
      </header>
      <div className="h-32 bg-gradient-to-r from-sky-700 via-blue-600 to-violet-700" />
      <div className="px-5">
        {error && <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
        <div className="-mt-12 flex items-end">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-black bg-gradient-to-br from-sky-500 to-violet-600 text-2xl font-black">
            {initials}
          </div>
          <button onClick={() => void signOut()} className="ml-auto mb-2 flex items-center gap-2 rounded-full border border-xborder px-4 py-2 text-sm font-bold hover:bg-white/5">
            <LogOut size={16} /> Chiqish
          </button>
        </div>
        <h2 className="mt-3 text-2xl font-black">{activeProfile.fullName}</h2>
        <p className="text-sm text-xmuted">@{activeProfile.username}</p>
        <p className="mt-1 text-xs text-xmuted">{user.email}</p>

        <section className="mt-7 rounded-3xl border border-white/9 bg-white/[.035] p-4 shadow-xl shadow-slate-950/20 backdrop-blur-2xl">
          <div className="flex items-center gap-2"><Settings2 size={18} /><h3 className="font-bold">Profil sozlamalari</h3></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-xmuted">Ism
              <input value={activeProfile.fullName} onChange={(event) => setProfile({ ...activeProfile, fullName: event.target.value })} className="mt-1 block w-full rounded-xl border border-xborder bg-transparent px-3 py-2.5 text-sm text-white outline-none focus:border-xblue" />
            </label>
            <label className="text-xs text-xmuted">Username
              <div className="mt-1 flex rounded-xl border border-xborder px-3 focus-within:border-xblue"><span className="py-2.5 text-xmuted">@</span><input value={activeProfile.username} onChange={(event) => setProfile({ ...activeProfile, username: event.target.value.replace(/\s/g, "") })} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" /></div>
            </label>
            <label className="text-xs text-xmuted">Trading uslubi
              <select value={activeProfile.tradingStyle} onChange={(event) => setProfile({ ...activeProfile, tradingStyle: event.target.value })} className="mt-1 block w-full rounded-xl border border-white/10 bg-[#111a2a]/65 px-3 py-2.5 text-sm text-white backdrop-blur-xl">
                <option>Price Action</option><option>Scalping</option><option>Swing Trading</option><option>Algorithmic</option>
              </select>
            </label>
            <label className="text-xs text-xmuted">Joylashuv
              <div className="mt-1 flex rounded-xl border border-xborder px-3 focus-within:border-xblue"><MapPin className="mt-2.5 text-xmuted" size={16} /><input value={activeProfile.location} onChange={(event) => setProfile({ ...activeProfile, location: event.target.value })} placeholder="Toshkent" className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none" /></div>
            </label>
            <label className="text-xs text-xmuted sm:col-span-2">Bio
              <textarea value={activeProfile.bio} onChange={(event) => setProfile({ ...activeProfile, bio: event.target.value })} maxLength={160} className="mt-1 min-h-24 w-full resize-none rounded-xl border border-xborder bg-transparent px-3 py-2.5 text-sm text-white outline-none focus:border-xblue" placeholder="Trading tajribangiz haqida..." />
            </label>
          </div>
          <button onClick={() => void save()} className="mt-4 flex items-center gap-2 rounded-full bg-xblue px-5 py-2.5 text-sm font-bold">
            {saved ? <Check size={17} /> : null}{saved ? "Saqlandi" : "O'zgarishlarni saqlash"}
          </button>
        </section>
      </div>
    </>
  );
}
