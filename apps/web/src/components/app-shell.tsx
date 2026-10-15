"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, CalendarDays, ChartNoAxesCombined, LayoutDashboard, LogOut, Menu, MessageSquareText, Settings, ShieldCheck, Target, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "./brand";

const items = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Community", "/community", MessageSquareText],
  ["Accounts", "/accounts", WalletCards],
  ["Trades", "/trades", ChartNoAxesCombined],
  ["Calendar", "/calendar", CalendarDays],
  ["Analytics", "/analytics", ChartNoAxesCombined],
  ["AI Coach", "/coach", Bot],
  ["Evaluations", "/evaluations", Target],
  ["Risk", "/risk", ShieldCheck]
] as const;

const mobileItems = [
  ["Home", "/dashboard", LayoutDashboard],
  ["Community", "/community", MessageSquareText],
  ["Accounts", "/accounts", WalletCards],
  ["Trades", "/trades", ChartNoAxesCombined],
  ["Calendar", "/calendar", CalendarDays],
  ["Profile", "/settings/profile", Settings]
] as const;

type TradingAccount = { id: string; name: string; initial_balance: number };

export function AppShell({ children, user, initialSelectedAccountId }: { children: React.ReactNode; user?: { name: string; email: string; initials: string } | undefined; initialSelectedAccountId?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState(initialSelectedAccountId ?? "all");
  useEffect(() => {
    let active = true;
    fetch("/api/account-switcher", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => {
      if (!active || !data) return;
      setAccounts(data.accounts ?? []);
      setSelectedAccountId(data.selectedAccountId ?? "all");
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  function selectAccount(value: string) {
    setSelectedAccountId(value);
    document.cookie = `tradoxy_account=${value === "all" ? "" : value}; Path=/; Max-Age=${value === "all" ? 0 : 31536000}; SameSite=Lax`;
    router.refresh();
  }
  const accountControl = <select aria-label="Select trading account" value={selectedAccountId} onChange={(event) => selectAccount(event.target.value)} className="account-select"><option value="all">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · ${Number(account.initial_balance || 0).toLocaleString()}</option>)}</select>;
  return <div className="min-h-screen bg-[#080D17]">
    {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
    <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[68px] items-center justify-between px-5"><Brand/><button className="icon-button lg:hidden" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <div className="account-switcher"><span className="account-status"/><span className="min-w-0 flex-1"><span>Trading account</span>{accountControl}<Link href="/accounts" className="account-manage-link">Manage accounts <WalletCards size={13}/></Link></span></div>
      <nav className="mt-6 space-y-1 px-3">{items.map(([label,href,Icon]) => { const active = pathname === href || (href === "/community" && pathname.startsWith("/community/")); return <Link key={href} href={href} onClick={()=>setOpen(false)} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${active ? "bg-[#1B293B] text-white" : "text-[#91A0B5] hover:bg-[#101827] hover:text-white"}`}><Icon size={17}/>{label}</Link>})}</nav>
      <div className="mt-auto p-3"><div className="profile-dock"><Link href="/settings/profile" className="flex min-w-0 flex-1 items-center gap-3"><span className="profile-avatar">{user?.initials || "TR"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user?.name || "Trader"}</span><span className="block truncate text-[11px] text-[var(--muted)]">{user?.email || "Free workspace"}</span></span><Settings size={15}/></Link><form action="/auth/sign-out" method="post"><button title="Sign out" className="profile-logout"><LogOut size={15}/></button></form></div></div>
    </aside>
    <div className="lg:pl-[232px]">
      <header className="app-header"><button aria-label="Open navigation" className="icon-button mr-3 lg:hidden" onClick={()=>setOpen(true)}><Menu size={18}/></button><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">My workspace <span className="text-[var(--muted)]">/ {items.find(([,href])=>pathname.startsWith(href))?.[0] || "Workspace"}</span></p></div><div className="mobile-account-control lg:hidden">{accountControl}</div><Link aria-label="Profile settings" href="/settings/profile" className="icon-button lg:hidden"><Settings size={17}/></Link></header>
      <main className="mx-auto max-w-[1540px] p-4 pb-24 sm:p-6 sm:pb-24 lg:p-7">{children}</main>
    </div>
    <nav className="app-mobile-nav lg:hidden" aria-label="Primary navigation">{mobileItems.map(([label,href,Icon]) => { const active = pathname === href || (href === "/community" && pathname.startsWith("/community/")); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""}><Icon size={19}/><span>{label}</span></Link>})}</nav>
  </div>;
}
