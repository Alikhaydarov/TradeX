"use client";

import { BrainCircuit, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type AccountRow = { id: string; name: string; firm: string; phase: string; account_size: string; status: string };
type Report = { title: string; summary: string; score: number; mood: string; strengths: string[]; mistakes: string[]; riskWarnings: string[]; nextSteps: string[]; generatedBy: string };

export function JournalAiCoachWorkspace() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountId, setAccountId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ accounts: AccountRow[] }>("/api/prop-accounts")
      .then((res) => {
        if (!active) return;
        setAccounts(res.accounts || []);
        setAccountId(res.accounts?.[0]?.id || "");
      })
      .catch((err: Error) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  async function refresh() {
    if (!accountId) return;
    setWorking(true);
    setError(null);
    try {
      const res = await apiRequest<{ report: Report }>(`/api/ai/trade-report?accountId=${encodeURIComponent(accountId)}`);
      setReport(res.report);
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : "AI failed to load.");
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => { void refresh(); }, [accountId]);

  if (loading) return <div className="grid min-h-[360px] place-items-center"><LoaderCircle className="animate-spin" /></div>;

  if (!accounts.length) return <div className="grid min-h-[360px] place-items-center rounded-[1.75rem] border border-dashed border-white/10 bg-white/[.025] text-center"><div><BrainCircuit className="mx-auto text-[#d9f96d]" size={34} /><h2 className="mt-4 text-xl font-black">AI Coach account kutyapti</h2><p className="mt-2 text-sm text-zinc-500">Avval account yarating.</p></div></div>;

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-white/10 bg-white/[.035] p-4 backdrop-blur-2xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[.06] text-[#d9f96d]"><BrainCircuit size={24} /></span><div><h1 className="text-xl font-black">AI Coach</h1><p className="text-xs text-zinc-500">Account bo'yicha alohida tahlil.</p></div></div>
          <div className="sm:ml-auto sm:min-w-[280px]"><Select value={accountId} onValueChange={setAccountId}><SelectTrigger><SelectValue placeholder="Account tanlang" /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
          <Button variant="outline" onClick={() => void refresh()} disabled={working}>{working ? <LoaderCircle className="animate-spin" size={15} /> : <RefreshCw size={15} />} Refresh</Button>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-rose-300/15 bg-rose-400/[.065] p-4 text-sm text-rose-100">{error}</div> : null}

      <section className="rounded-[1.75rem] border border-white/10 bg-white/[.035] p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-center"><p className="text-[10px] font-black uppercase tracking-[.22em] text-white/48">Score</p><p className="mt-3 font-mono text-6xl font-black text-[#d9f96d]">{report ? Math.round(report.score) : "--"}</p><p className="mt-3 text-xs font-black uppercase text-white/58">{report?.mood || "waiting"}</p></div>
          <div><h2 className="text-2xl font-black">{report?.title || "AI account analysis"}</h2><p className="mt-3 text-sm leading-7 text-white/68">{working ? "AI tahlil qilyapti..." : report?.summary || "Refresh bosing."}</p></div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="Warnings" items={report?.riskWarnings || ["Warning yo'q."]} />
        <Block title="Next actions" items={report?.nextSteps || ["Refreshdan keyin chiqadi."]} />
        <Block title="Mistakes" items={report?.mistakes || ["Katta xato aniqlanmadi."]} />
        <Block title="Strengths" items={report?.strengths || ["Data kerak."]} />
      </div>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return <Card><CardContent className="p-4 sm:p-5"><h3 className="font-black">{title}</h3><div className="mt-3 space-y-2">{items.map((i) => <div key={i} className="rounded-2xl border border-white/10 bg-white/[.025] px-3 py-2 text-sm leading-6 text-zinc-300">{i}</div>)}</div></CardContent></Card>;
}
