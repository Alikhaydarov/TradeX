"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bot, CalendarDays, ChartNoAxesCombined, ChevronsUpDown, LayoutDashboard, Menu, Search, Settings, ShieldCheck, Target, WalletCards, X } from "lucide-react";
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen bg-[#080D17]">
    {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[244px] flex-col border-r border-[#27364A] bg-[#080D17] transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-16 items-center justify-between border-b border-[#27364A] px-4"><Brand/><button className="grid size-8 place-items-center lg:hidden" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <button className="mx-3 mt-4 flex items-center gap-3 rounded-md border border-[#27364A] bg-[#101827] p-3 text-left"><span className="size-2 rounded-full bg-[#35D6AD]"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">Apex 100K</span><span className="block font-mono text-[11px] text-[#91A0B5]">$101,240.00</span></span><ChevronsUpDown size={15} className="text-[#91A0B5]"/></button>
      <nav className="mt-6 space-y-1 px-3">{items.map(([label,href,Icon]) => { const active = pathname === href; return <Link key={href} href={href} onClick={()=>setOpen(false)} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${active ? "bg-[#1B293B] text-white" : "text-[#91A0B5] hover:bg-[#101827] hover:text-white"}`}><Icon size={17}/>{label}</Link>})}</nav>
      <div className="mt-auto border-t border-[#27364A] p-3"><Link href="/settings/profile" className="flex items-center gap-3 rounded-md p-2 hover:bg-[#101827]"><span className="grid size-9 place-items-center rounded-md bg-[#1B293B] text-sm font-semibold">AX</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">Alex Morgan</span><span className="block truncate text-xs text-[#91A0B5]">Pro plan</span></span><Settings size={16} className="text-[#91A0B5]"/></Link></div>
    </aside>
    <div className="lg:pl-[244px]">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#27364A] bg-[#080D17]/95 px-4 backdrop-blur lg:px-6"><button className="mr-3 grid size-9 place-items-center rounded-md border border-[#27364A] lg:hidden" onClick={()=>setOpen(true)}><Menu size={18}/></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Apex 100K <span className="text-[#91A0B5]">/ Dashboard</span></p></div><div className="flex items-center gap-1"><button aria-label="Search" className="grid size-9 place-items-center rounded-md text-[#91A0B5] hover:bg-[#101827] hover:text-white"><Search size={18}/></button><button aria-label="Notifications" className="relative grid size-9 place-items-center rounded-md text-[#91A0B5] hover:bg-[#101827] hover:text-white"><Bell size={18}/><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#35D6AD]"/></button></div></header>
      <main className="mx-auto max-w-[1500px] p-4 sm:p-6">{children}</main>
    </div>
  </div>;
}

