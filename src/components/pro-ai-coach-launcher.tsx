"use client";

import {
  BrainCircuit,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ChatResponse = {
  model: string;
  message: ChatMessage;
  persistence: boolean;
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

const suggestedQuestions = [
  "Oxirgi trade'larimdagi asosiy xato nima?",
  "Qaysi setup eng yaxshi natija beryapti?",
  "Risk boshqaruvimni tahlil qil.",
  "So‘nggi 20 trade'ni qisqa xulosa qil.",
];

export function ProAiCoachLauncher() {
  const [pathname, setPathname] = useState("");
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [persistence, setPersistence] = useState(true);
  const [chatError, setChatError] = useState("");
  const [reportQuestion, setReportQuestion] = useState("What should I improve next?");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [report, setReport] = useState<AiResponse | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      setAccountId((current) =>
        current && nextAccounts.some((account) => account.id === current)
          ? current
          : preferred,
      );
    } catch {
      setAccounts([]);
    }
  }, []);

  const loadHistory = useCallback(async (nextAccountId: string) => {
    if (!nextAccountId) {
      setMessages([]);
      return;
    }
    setHistoryLoading(true);
    setChatError("");
    try {
      const response = await apiRequest<{
        messages: ChatMessage[];
        persistence: boolean;
      }>(`/api/ai/chat?accountId=${encodeURIComponent(nextAccountId)}`);
      setMessages(response.messages || []);
      setPersistence(response.persistence);
    } catch (caught) {
      setMessages([]);
      setChatError(caught instanceof Error ? caught.message : "Chat history could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadAccounts();
  }, [loadAccounts, open]);

  useEffect(() => {
    if (!open || !accountId) return;
    window.localStorage.setItem("tradeway.active-account-id", accountId);
    setReport(null);
    setReportError("");
    void loadHistory(accountId);
  }, [accountId, loadHistory, open]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const isPro = status?.plan === "pro" && status.aiEnabled;
  const visible = pathname.startsWith("/dashboard") && isPro;
  const selectedAccount = accounts.find((account) => account.id === accountId) || null;

  const sendMessage = async (preset?: string) => {
    const text = (preset ?? question).trim();
    if (!text || !accountId || sending) return;

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimistic]);
    setQuestion("");
    setSending(true);
    setChatError("");

    try {
      const response = await apiRequest<ChatResponse>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ accountId, message: text }),
      });
      setMessages((current) => [...current, response.message]);
      setPersistence(response.persistence);
    } catch (caught) {
      setChatError(caught instanceof Error ? caught.message : "Tradox AI could not answer.");
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    if (!accountId) return;
    setChatError("");
    try {
      await apiRequest(`/api/ai/chat?accountId=${encodeURIComponent(accountId)}`, {
        method: "DELETE",
      });
      setMessages([]);
    } catch (caught) {
      setChatError(caught instanceof Error ? caught.message : "Chat could not be cleared.");
    }
  };

  const generateReport = async () => {
    if (!accountId || reportLoading) return;
    setReportLoading(true);
    setReportError("");
    setReport(null);
    try {
      const response = await apiRequest<AiResponse>("/api/ai/trade-coach", {
        method: "POST",
        body: JSON.stringify({ accountId, question: reportQuestion }),
      });
      setReport(response);
    } catch (caught) {
      setReportError(caught instanceof Error ? caught.message : "Tradox AI could not generate the report.");
    } finally {
      setReportLoading(false);
    }
  };

  const confidence = useMemo(() => {
    const value = Number(report?.insight?.confidence ?? 0);
    return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
  }, [report]);

  if (!visible) return null;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[80] h-11 rounded-full border border-white/12 bg-white px-4 text-black shadow-[0_16px_45px_rgba(0,0,0,.5)] hover:bg-zinc-200 sm:bottom-6 sm:right-6"
        aria-label="Open Tradox AI"
      >
        <BrainCircuit className="size-4" /> Tradox AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-hidden border-white/10 bg-[#070707] p-0 sm:max-w-[760px]">
          <DialogHeader className="border-b border-white/8 px-4 py-4 text-left sm:px-5 sm:py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-amber-300/15 text-amber-200 hover:bg-amber-300/15">
                <Sparkles className="size-3.5" /> Pro
              </Badge>
              <span className="text-xs text-zinc-600">Account-scoped Groq analysis</span>
            </div>
            <DialogTitle className="mt-2 text-2xl font-semibold text-white">Tradox AI</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Ask in any language. Answers use only the selected account’s Supabase journal data.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b border-white/8 px-4 py-3 sm:px-5">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="grid gap-1.5 text-xs font-medium text-zinc-500">
                Selected trading account
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-11 rounded-xl border-white/10 bg-black">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="z-[170] border-white/10 bg-[#0b0b0b]">
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}{account.firm ? ` · ${account.firm}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-white/8 bg-black px-3 text-xs text-zinc-500">
                <LockKeyhole className="size-4 text-amber-300" /> Pro-only backend
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
            <div className="border-b border-white/8 px-4 py-2 sm:px-5">
              <TabsList className="w-full border-white/8 bg-black">
                <TabsTrigger value="chat">
                  <MessageCircle className="size-4" /> Chat
                </TabsTrigger>
                <TabsTrigger value="report">
                  <Sparkles className="size-4" /> Account report
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="min-h-0">
              <div className="flex h-[min(62dvh,590px)] min-h-[430px] flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  {historyLoading ? (
                    <div className="grid h-full place-items-center text-sm text-zinc-600">
                      <LoaderCircle className="size-5 animate-spin" />
                    </div>
                  ) : messages.length ? (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <article
                          key={message.id}
                          className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                            message.role === "user"
                              ? "ml-auto bg-white text-black"
                              : "mr-auto border border-white/8 bg-[#0c0c0c] text-zinc-200"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </article>
                      ))}
                      {sending ? (
                        <div className="mr-auto flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0c0c0c] px-4 py-3 text-sm text-zinc-500">
                          <LoaderCircle className="size-4 animate-spin" /> Tradox AI is analyzing {selectedAccount?.name || "the account"}…
                        </div>
                      ) : null}
                      <div ref={chatEndRef} />
                    </div>
                  ) : (
                    <div className="grid h-full content-center gap-5 text-center">
                      <div>
                        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/8 bg-[#0d0d0d] text-zinc-300">
                          <BrainCircuit className="size-5" />
                        </span>
                        <h3 className="mt-3 text-base font-semibold text-white">Ask about this account</h3>
                        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-zinc-600">
                          Tradox AI can explain performance, setups, sessions, risk behavior and repeated mistakes. It does not provide trade signals.
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {suggestedQuestions.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => void sendMessage(item)}
                            disabled={!accountId || sending}
                            className="rounded-xl border border-white/8 bg-[#0a0a0a] px-3 py-3 text-left text-xs leading-5 text-zinc-400 transition hover:border-white/15 hover:bg-white/[.035] hover:text-white disabled:opacity-40"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/8 bg-[#080808] p-3 sm:p-4">
                  {chatError ? (
                    <div className="mb-3 rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-3 py-2 text-xs text-rose-200">
                      {chatError}
                    </div>
                  ) : null}
                  {!persistence ? (
                    <div className="mb-3 rounded-xl border border-amber-300/15 bg-amber-300/[.06] px-3 py-2 text-xs text-amber-100">
                      Chat works, but history storage needs the latest Supabase migration.
                    </div>
                  ) : null}
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={question}
                      onChange={(event) => setQuestion(event.target.value.slice(0, 2000))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      className="max-h-36 min-h-11 resize-none rounded-xl border-white/10 bg-black text-sm text-white"
                      placeholder="Ask Tradox AI in any language…"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => void sendMessage()}
                      disabled={sending || !accountId || !question.trim()}
                      className="size-11 shrink-0 rounded-xl bg-white text-black hover:bg-zinc-200"
                      aria-label="Send message"
                    >
                      {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="truncate text-[10px] text-zinc-700">Only {selectedAccount?.name || "the selected account"} data is used.</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void clearChat()}
                      disabled={!messages.length}
                      className="h-7 rounded-lg px-2 text-[10px] text-zinc-600 hover:text-rose-300"
                    >
                      <Trash2 className="size-3" /> Clear
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="report" className="max-h-[66dvh] overflow-y-auto p-4 sm:p-5">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-black p-4">
                  <p className="text-xs font-medium text-zinc-500">Report focus</p>
                  <Textarea
                    value={reportQuestion}
                    onChange={(event) => setReportQuestion(event.target.value.slice(0, 500))}
                    className="mt-2 min-h-24 rounded-xl border-white/10 bg-[#090909] text-sm text-white"
                    placeholder="What should Tradox AI analyze?"
                  />
                  <Button
                    type="button"
                    onClick={() => void generateReport()}
                    disabled={reportLoading || !accountId}
                    className="mt-3 h-11 w-full rounded-xl bg-white text-black hover:bg-zinc-200"
                  >
                    {reportLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {reportLoading ? "Analyzing journal…" : "Generate account report"}
                  </Button>
                </div>

                {reportError ? (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-4 py-3 text-sm text-rose-200">
                    {reportError}
                  </div>
                ) : null}

                {report ? (
                  <section className="space-y-4 rounded-2xl border border-white/10 bg-black p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Tradox AI report</p>
                        <h3 className="mt-1 text-lg font-semibold text-white">{report.insight.headline || "Account review"}</h3>
                      </div>
                      <Badge variant="secondary" className="rounded-full bg-white/[.07] text-zinc-300">
                        {confidence}% confidence
                      </Badge>
                    </div>

                    <p className="text-sm leading-6 text-zinc-300">{report.insight.summary}</p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InsightList title="Strengths" items={report.insight.strengths || []} tone="positive" />
                      <InsightList title="Risks" items={report.insight.risks || []} tone="negative" />
                    </div>

                    <div className="rounded-xl border border-sky-300/15 bg-sky-300/[.06] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-sky-300">Next action</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-200">{report.insight.nextAction}</p>
                    </div>
                  </section>
                ) : (
                  <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/8 bg-black/40 px-5 text-center">
                    <div>
                      <RotateCcw className="mx-auto size-5 text-zinc-700" />
                      <p className="mt-3 text-sm font-semibold text-zinc-400">No report generated yet</p>
                      <p className="mt-1 text-xs text-zinc-700">Reports summarize the selected account’s latest reviewed trades.</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0a0a] p-3">
      <p className={`text-[10px] font-semibold uppercase tracking-[0.13em] ${tone === "positive" ? "text-emerald-300" : "text-rose-300"}`}>
        {title}
      </p>
      <div className="mt-2 space-y-2">
        {items.length ? (
          items.slice(0, 3).map((item) => (
            <p key={item} className="text-xs leading-5 text-zinc-400">• {item}</p>
          ))
        ) : (
          <p className="text-xs text-zinc-600">No reliable pattern yet.</p>
        )}
      </div>
    </div>
  );
}
