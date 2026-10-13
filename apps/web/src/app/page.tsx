import Link from "next/link";
import { ArrowRight, BrainCircuit, ChartNoAxesCombined, Check, Gauge, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";

const metrics = [
  ["Net P&L", "+$12,840.20", "text-[#35D6AD]"],
  ["Win rate", "68.2%", "text-[#F5F7FB]"],
  ["Profit factor", "2.14", "text-[#F5F7FB]"],
  ["Risk today", "0.72%", "text-[#F2B65B]"]
] as const;

export default function Home() {
  return <main className="min-h-screen overflow-hidden bg-[#080D17]">
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#27364A]/70 bg-[#080D17]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-7 text-sm text-[#91A0B5] md:flex"><a href="#platform" className="hover:text-white">Platform</a><a href="#intelligence" className="hover:text-white">Intelligence</a><a href="#security" className="hover:text-white">Security</a></nav>
        <div className="flex items-center gap-2"><Link href="/sign-in" className="hidden px-3 py-2 text-sm text-[#91A0B5] sm:block">Sign in</Link><Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-md bg-[#F5F7FB] px-4 text-sm font-semibold text-[#080D17]">Open workspace <ArrowRight size={15} /></Link></div>
      </div>
    </header>

    <section className="relative mx-auto flex min-h-[760px] max-w-[1240px] flex-col items-center px-5 pb-16 pt-36 text-center lg:px-8 lg:pt-44">
      <div className="absolute left-1/2 top-20 -z-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[#35D6AD]/[0.06] blur-[120px]" />
      <div className="reveal relative z-10 inline-flex items-center gap-2 rounded-full border border-[#27364A] bg-[#101827] px-3 py-1.5 text-xs text-[#91A0B5]"><span className="size-1.5 rounded-full bg-[#35D6AD]" /> Built for deliberate traders</div>
      <h1 className="reveal reveal-delay relative z-10 mt-7 max-w-[860px] text-balance text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-[76px]">See the decisions behind your performance.</h1>
      <p className="reveal reveal-delay relative z-10 mt-6 max-w-[620px] text-pretty text-base leading-7 text-[#91A0B5] sm:text-lg">One calm workspace for journaling, risk control, evaluations and AI-assisted review. Connect your trading data and turn every session into a repeatable edge.</p>
      <div className="reveal reveal-delay relative z-10 mt-8 flex flex-wrap justify-center gap-3"><Link href="/dashboard" className="inline-flex h-11 items-center gap-2 rounded-md bg-[#35D6AD] px-5 text-sm font-semibold text-[#080D17]">Start free <ArrowRight size={16} /></Link><a href="#platform" className="inline-flex h-11 items-center rounded-md border border-[#27364A] bg-[#101827] px-5 text-sm font-medium">Explore platform</a></div>
      <div className="relative z-10 mt-5 flex flex-wrap justify-center gap-5 text-xs text-[#91A0B5]"><span className="flex items-center gap-1.5"><Check size={13} className="text-[#35D6AD]" /> No card required</span><span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-[#35D6AD]" /> Encrypted by default</span></div>

      <div id="platform" className="reveal relative z-10 mt-16 w-full max-w-[1040px] rounded-lg border border-[#27364A] bg-[#101827] p-2 shadow-[0_35px_100px_rgba(0,0,0,.45)]">
        <div className="overflow-hidden rounded-md border border-[#27364A] bg-[#080D17] text-left">
          <div className="flex h-11 items-center justify-between border-b border-[#27364A] px-4"><div className="flex items-center gap-2 text-xs text-[#91A0B5]"><span className="size-2 rounded-full bg-[#F16B78]"/><span className="size-2 rounded-full bg-[#F2B65B]"/><span className="size-2 rounded-full bg-[#35D6AD]"/></div><span className="font-mono text-[10px] text-[#91A0B5]">LIVE PERFORMANCE</span></div>
          <div className="grid gap-3 p-4 md:grid-cols-4">{metrics.map(([label,value,color]) => <div key={label} className="rounded-md border border-[#27364A] bg-[#101827] p-4"><p className="text-[11px] uppercase text-[#91A0B5]">{label}</p><p className={`mt-3 font-mono text-xl font-medium ${color}`}>{value}</p></div>)}</div>
          <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="relative h-64 overflow-hidden rounded-md border border-[#27364A] bg-[#101827] p-5"><p className="text-sm font-medium">Equity progression</p><p className="mt-1 text-xs text-[#91A0B5]">30 day account performance</p><svg viewBox="0 0 700 190" className="absolute inset-x-4 bottom-3 w-[calc(100%-2rem)]" aria-label="Rising equity curve"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#35D6AD" stopOpacity=".28"/><stop offset="1" stopColor="#35D6AD" stopOpacity="0"/></linearGradient></defs><path d="M0 150 L62 141 L120 145 L180 120 L240 130 L304 94 L365 108 L428 68 L490 82 L552 48 L614 56 L700 18 L700 190 L0 190Z" fill="url(#area)"/><path d="M0 150 L62 141 L120 145 L180 120 L240 130 L304 94 L365 108 L428 68 L490 82 L552 48 L614 56 L700 18" fill="none" stroke="#35D6AD" strokeWidth="2"/></svg></div>
            <div className="rounded-md border border-[#27364A] bg-[#101827] p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Risk posture</p><p className="mt-1 text-xs text-[#91A0B5]">Within your daily plan</p></div><Gauge className="text-[#35D6AD]" size={21}/></div><div className="mt-8 space-y-5">{[["Daily loss","24%"],["Open exposure","38%"],["Plan alignment","91%"]].map(([label,width])=><div key={label}><div className="mb-2 flex justify-between text-xs"><span className="text-[#91A0B5]">{label}</span><span>{width}</span></div><div className="h-1 rounded-full bg-[#27364A]"><div className="h-full rounded-full bg-[#35D6AD]" style={{width}}/></div></div>)}</div></div>
          </div>
        </div>
      </div>
    </section>

    <section id="intelligence" className="border-y border-[#27364A] bg-[#101827]"><div className="mx-auto grid max-w-[1240px] gap-5 px-5 py-20 lg:grid-cols-3 lg:px-8">{[
      [ChartNoAxesCombined,"Journal with context","Review entries, exits, screenshots and decisions without turning your process into admin work."],
      [ShieldCheck,"Risk before regret","Deterministic limits track daily loss, total drawdown and position exposure in real time."],
      [BrainCircuit,"AI that cites your data","Ask precise questions about your history. Structured tools keep every insight traceable."]
    ].map(([Icon,title,copy]) => { const C = Icon as typeof ShieldCheck; return <article key={String(title)} className="border-t border-[#27364A] pt-6"><C size={21} className="text-[#35D6AD]"/><h2 className="mt-5 text-lg font-semibold">{String(title)}</h2><p className="mt-3 text-sm leading-6 text-[#91A0B5]">{String(copy)}</p></article>})}</div></section>
    <footer id="security" className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-10 text-xs text-[#91A0B5] sm:flex-row sm:items-center sm:justify-between lg:px-8"><Brand/><p>© 2026 Tradoxy. Performance intelligence for serious traders.</p></footer>
  </main>;
}

