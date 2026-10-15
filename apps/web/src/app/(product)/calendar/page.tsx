import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { MetricCard, PageHeader, Panel } from "@/components/page-primitives";
import { getJournalData, money, summarizeTrades } from "@/lib/journal-data";

export const dynamic = "force-dynamic";

function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function shiftMonth(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: requestedMonth } = await searchParams;
  const validMonth = requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth) && Number(requestedMonth.slice(5)) >= 1 && Number(requestedMonth.slice(5)) <= 12;
  const selectedMonth = validMonth ? new Date(Number(requestedMonth!.slice(0, 4)), Number(requestedMonth!.slice(5)) - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const month = monthKey(selectedMonth);
  const { trades, failed } = await getJournalData();
  const monthly = trades.filter((trade) => trade.traded_at.slice(0, 7) === month);
  const summary = summarizeTrades(monthly);
  const daily = new Map<string, number>();
  for (const trade of monthly) daily.set(trade.traded_at.slice(0, 10), (daily.get(trade.traded_at.slice(0, 10)) ?? 0) + (trade.pnl ?? 0));
  const tradingDays = [...daily.entries()];
  const bestDay = [...tradingDays].sort((a, b) => b[1] - a[1])[0];
  const firstWeekday = (selectedMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
  const cells = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);
  const previous = monthKey(shiftMonth(selectedMonth, -1));
  const next = monthKey(shiftMonth(selectedMonth, 1));
  const monthName = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(selectedMonth);

  return <div className="space-y-4">
    <PageHeader eyebrow="Journal" title="Performance calendar" description="Review real daily outcomes and jump straight to the trades behind each session." action={<Link href="/trades" className="rounded-md border border-[#202529] bg-[#0f1214] px-3 py-2 text-sm hover:bg-[#15191c]">Open journal</Link>}/>
    {failed && <p role="status" className="rounded-md border border-[#54373a] bg-[#1a1011] px-4 py-3 text-sm text-[#ff9ea7]">Calendar data is temporarily unavailable.</p>}
    <div className="grid gap-3 sm:grid-cols-3"><MetricCard label={`${monthName} P&L`} value={money(summary.pnl)} helper={`${monthly.length} recorded trades`} icon={summary.pnl >= 0 ? TrendingUp : TrendingDown} tone={summary.pnl >= 0 ? "positive" : "warning"}/><MetricCard label="Trading days" value={String(tradingDays.length)} helper={`${summary.wins} winning · ${summary.losses} losing`} icon={CalendarDays}/><MetricCard label="Best session" value={bestDay ? money(bestDay[1]) : "—"} helper={bestDay ? new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(`${bestDay[0]}T00:00:00Z`)) : "No trades this month"} icon={TrendingUp} tone="positive"/></div>
    <Panel title={`${monthName} performance`} description="Select a date with trades to inspect that session.">
      <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Link href={`/calendar?month=${previous}`} aria-label="Previous month" className="grid size-9 place-items-center rounded-md border border-[#202529] hover:bg-[#15191c]"><ChevronLeft size={16}/></Link><h2 className="min-w-32 text-center text-sm font-semibold">{monthName}</h2><Link href={`/calendar?month=${next}`} aria-label="Next month" className="grid size-9 place-items-center rounded-md border border-[#202529] hover:bg-[#15191c]"><ChevronRight size={16}/></Link></div><Link href="/calendar" className="rounded-md border border-[#202529] px-3 py-2 text-xs text-[#cbd1d2] hover:bg-[#15191c]">Current month</Link></div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day)=><div key={day} className="pb-1 text-center text-[9px] font-medium uppercase text-[#899196] sm:text-[10px]">{day}</div>)}{cells.map((day,index)=>{
        if (!day) return <div aria-hidden="true" key={`empty-${index}`} className="aspect-square rounded-md"/>;
        const key = `${month}-${String(day).padStart(2,"0")}`;
        const result = daily.get(key);
        return <Link key={key} href={result !== undefined ? `/trades?date=${key}` : `/trades?date=${key}`} aria-label={`${key}${result === undefined ? ", no trades" : `, ${money(result)}`}`} className={`flex aspect-square min-h-[54px] flex-col justify-between rounded-md border p-1.5 text-left transition-colors sm:min-h-[86px] sm:p-2 ${result === undefined ? "border-[#202529] bg-[#080a0b] hover:bg-[#101314]" : result >= 0 ? "border-[#1c493d] bg-[#0c1713] hover:bg-[#10231c]" : "border-[#49282d] bg-[#190f11] hover:bg-[#241316]"}`}><span className="text-[10px] text-[#cbd1d2] sm:text-xs">{day}</span>{result === undefined ? <span className="truncate text-center text-[8px] text-[#687174] sm:text-[10px]">—</span> : <><span className={`truncate text-[8px] font-semibold sm:text-[11px] ${result >= 0 ? "text-[#43e1b0]" : "text-[#f16b78]"}`}>{money(result)}</span><span className="text-[8px] text-[#899196] sm:text-[10px]">{monthly.filter((trade) => trade.traded_at.slice(0,10) === key).length} trades</span></>}</Link>;
      })}</div>
      {!monthly.length && <div className="mt-4 flex flex-col items-start gap-3 rounded-md border border-dashed border-[#303638] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">No journal entries in {monthName}</p><p className="mt-1 text-xs text-[#899196]">When trades are added, daily results will appear in this calendar.</p></div><Link href="/trades?add=1" className="rounded-md bg-[#43e1b0] px-3 py-2 text-xs font-semibold text-[#07100d]">Add trade</Link></div>}
    </Panel>
  </div>;
}
