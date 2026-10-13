"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bot, CalendarDays, ChartNoAxesCombined, ChevronsUpDown, LayoutDashboard, LogOut, Menu, Search, Settings, ShieldCheck, Target, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";

const items = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Accounts", "/accounts", WalletCards],
  ["Calendar", "/calendar", CalendarDays],
  ["Analytics", "/analytics", ChartNoAxesCombined],
  ["AI Coach", "/coach", Bot],
  ["Evaluations", "/evaluations", Target],
  ["Risk", "/risk", ShieldCheck]
] as const;

export function AppShell({ children, user }: { children: React.ReactNode; user?: { name: string; email: string; initials: string } | undefined }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen bg-[#080D17]">
    {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
    <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[68px] items-center justify-between px-5"><Brand/><button className="icon-button lg:hidden" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <button className="account-switcher"><span className="account-status"/><span className="min-w-0 flex-1"><span>Apex 100K</span><small>$101,240.00</small></span><ChevronsUpDown size={14}/></button>
      <nav className="mt-6 space-y-1 px-3">{items.map(([label,href,Icon]) => { const active = pathname === href; return <Link key={href} href={href} onClick={()=>setOpen(false)} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${active ? "bg-[#1B293B] text-white" : "text-[#91A0B5] hover:bg-[#101827] hover:text-white"}`}><Icon size={17}/>{label}</Link>})}</nav>
      <div className="mt-auto p-3"><div className="profile-dock"><Link href="/settings/profile" className="flex min-w-0 flex-1 items-center gap-3"><span className="profile-avatar">{user?.initials || "TR"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user?.name || "Trader"}</span><span className="block truncate text-[11px] text-[var(--muted)]">{user?.email || "Free workspace"}</span></span><Settings size={15}/></Link><form action="/auth/sign-out" method="post"><button title="Sign out" className="profile-logout"><LogOut size={15}/></button></form></div></div>
    </aside>
    <div className="lg:pl-[232px]">
      <header className="app-header"><button className="icon-button mr-3 lg:hidden" onClick={()=>setOpen(true)}><Menu size={18}/></button><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">Apex 100K <span className="text-[var(--muted)]">/ {items.find(([,href])=>pathname.startsWith(href))?.[0] || "Workspace"}</span></p></div><div className="flex items-center gap-1"><button aria-label="Search" className="icon-button"><Search size={17}/></button><button aria-label="Notifications" className="icon-button relative"><Bell size={17}/><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--primary)]"/></button></div></header>
      <main className="mx-auto max-w-[1540px] p-4 sm:p-6 lg:p-7">{children}</main>
    </div>
  </div>;
}
