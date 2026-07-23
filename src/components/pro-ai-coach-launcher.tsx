"use client";

import { BrainCircuit, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

type PremiumStatus = {
  plan: "free" | "standard" | "pro";
  isPremium: boolean;
  aiEnabled: boolean;
};

type Account = {
  id: string;
  name: string;
  firm?: string | null;
};

type AiInsight = {
  headline?: string;
  summary?: string;
  strengths?: string[];
  risks?: string[];
  nextAction?: string;
  confidence?: number;
};

type AiResponse = {
  model: string;
  insight: AiInsight;
};

export function ProAiCoachLauncher() {
  const [pathname, setPathname] = useState("");
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [question, setQuestion] = useState("What should I improve next?");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AiResponse | null>(null);

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    syncPath();
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    let active = true;
    void apiRequest<PremiumStatus>("/api/premium/status")
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch(() => {
        if (active) setStatus(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await apiRequest<{ accounts: Account[] }>("/api/prop-accounts");
      const nextAccounts = response.accounts || [];
      setAccounts(nextAccounts);
      const stored = window.localStorage.getItem("tradeway.active-account-id") || "";
      const preferred = nextAccounts.some((account) => account.id === stored)
        ? stored
        : nextAccounts[0]?.id || "";
      setAccountId((current) => current || preferred);
    } catch {
      setAccounts([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadAccounts();
  }, [loadAccounts, open]);

  const isPro = status?.plan === "pro" && status.aiEnabled;
  const visible = pathname.startsWith("/dashboard") && isPro;

  const generate = async () => {
    if (!accountId || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await apiRequest<AiResponse>("/api/ai/trade-coach", {
        method: "POST",
        body: JSON.stringify({ accountId, question }),
      });
      setResult(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI Coach could not generate an insight.");
    } finally {
      setLoading(false);
    }
  };

  const confidence = useMemo(() => {
    const value = Number(result?.insight?.confidence ?? 0);
    return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
  }, [result]);

  if (!visible) return null;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[80] h-11 rounded-full border border-white/12 bg-white px-4 text-black shadow-[0_16px_45px_rgba(0,0,0,.5)] hover:bg-zinc-200 sm:bottom-6 sm:right-6"
        aria-label="Open Pro AI Coach"
      >
        <BrainCircuit className="size-4" /> AI Coach
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto border-white/10 bg-[#070707] p-0 sm:max-w-[680px]">
          <DialogHeader className="border-b border-white/8 px-5 py-5 text-left">
            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-amber-300/15 text-amber-200 hover:bg-amber-300/15">
                <Sparkles className="size-3.5" /> Pro
              </Badge>
              <span className="text-xs text-zinc-600">Groq-powered journal analysis</span>
            </div>
            <DialogTitle className="mt-3 text-2xl font-semibold text-white">Tradox AI Coach</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Reviews your latest closed trades. It does not generate signals or promise profits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-medium text-zinc-500">
                Trading account
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-11 rounded-xl border-white/10 bg-black">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="z-[160] border-white/10 bg-[#0b0b0b]">
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}{account.firm ? ` · ${account.firm}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <div className="rounded-xl border border-white/8 bg-black px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Access</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <LockKeyhole className="size-4 text-amber-300" /> Pro-only server endpoint
                </div>
              </div>
            </div>

            <label className="grid gap-2 text-xs font-medium text-zinc-500">
              Question
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, 500))}
                className="min-h-24 rounded-xl border-white/10 bg-black text-sm text-white"
                placeholder="What pattern is hurting my consistency?"
              />
            </label>

            <Button
              type="button"
              onClick={() => void generate()}
              disabled={loading || !accountId}
              className="h-11 w-full rounded-xl bg-white text-black hover:bg-zinc-200"
            >
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Analyzing journal..." : "Generate insight"}
            </Button>

            {error ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {result ? (
              <section className="space-y-4 rounded-2xl border border-white/10 bg-black p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">AI review</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{result.insight.headline || "Trade review"}</h3>
                  </div>
                  <Badge variant="secondary" className="rounded-full bg-white/[.07] text-zinc-300">
                    {confidence}% confidence
                  </Badge>
                </div>

                <p className="text-sm leading-6 text-zinc-300">{result.insight.summary}</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InsightList title="Strengths" items={result.insight.strengths || []} tone="positive" />
                  <InsightList title="Risks" items={result.insight.risks || []} tone="negative" />
                </div>

                <div className="rounded-xl border border-sky-300/15 bg-sky-300/[.06] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-sky-300">Next action</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-200">{result.insight.nextAction}</p>
                </div>
              </section>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InsightList({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "negative" }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0a0a] p-3">
      <p className={`text-[10px] font-semibold uppercase tracking-[0.13em] ${tone === "positive" ? "text-emerald-300" : "text-rose-300"}`}>
        {title}
      </p>
      <div className="mt-2 space-y-2">
        {items.length ? items.slice(0, 3).map((item) => (
          <p key={item} className="text-xs leading-5 text-zinc-400">• {item}</p>
        )) : <p className="text-xs text-zinc-600">No reliable pattern yet.</p>}
      </div>
    </div>
  );
}
