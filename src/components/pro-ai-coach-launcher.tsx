"use client";

import {
  BrainCircuit,
  LoaderCircle,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "./ui/textarea";

type PremiumStatus = {
  plan: "free" | "standard" | "pro";
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
  message: ChatMessage;
};

const suggestedQuestions = [
  "Oxirgi trade'larimdagi asosiy xato nima?",
  "Qaysi setup menga eng yaxshi natija beryapti?",
  "Risk boshqaruvimni qisqa tahlil qil.",
];

const AI_WORKSPACE_ROUTES = ["/dashboard", "/calendar", "/trades", "/analytics"];

function orderChatMessages(items: ChatMessage[]) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    const timeDifference = leftTime - rightTime;

    if (Number.isFinite(timeDifference) && timeDifference !== 0) {
      return timeDifference;
    }

    if (left.role !== right.role) {
      return left.role === "user" ? -1 : 1;
    }

    return left.id.localeCompare(right.id);
  });
}

export function ProAiCoachLauncher() {
  const [pathname, setPathname] = useState("");
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [chatError, setChatError] = useState("");
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
      const response = await apiRequest<{ messages: ChatMessage[] }>(
        `/api/ai/chat?accountId=${encodeURIComponent(nextAccountId)}`,
      );
      setMessages(orderChatMessages(response.messages || []));
    } catch (caught) {
      setMessages([]);
      setChatError(
        caught instanceof Error ? caught.message : "Chat history could not be loaded.",
      );
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
    void loadHistory(accountId);
  }, [accountId, loadHistory, open]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const isPro = status?.plan === "pro" && status.aiEnabled;
  const visible = Boolean(
    isPro && AI_WORKSPACE_ROUTES.some((route) => pathname.startsWith(route)),
  );
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
    } catch (caught) {
      setChatError(
        caught instanceof Error ? caught.message : "Tradox AI could not answer.",
      );
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    if (!accountId || clearing || !messages.length) return;

    setClearing(true);
    setChatError("");

    try {
      await apiRequest(`/api/ai/chat?accountId=${encodeURIComponent(accountId)}`, {
        method: "DELETE",
      });
      setMessages([]);
    } catch (caught) {
      setChatError(
        caught instanceof Error ? caught.message : "Chat could not be cleared.",
      );
    } finally {
      setClearing(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[80] h-11 rounded-full border border-white/10 bg-white px-4 text-black shadow-[0_16px_45px_rgba(0,0,0,.55)] transition hover:-translate-y-0.5 hover:bg-zinc-200 sm:bottom-6 sm:right-6"
        aria-label="Open Tradox AI"
      >
        <Sparkles className="size-4" /> Tradox AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(92dvh,760px)] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-[24px] border-white/10 bg-[#070707] p-0 sm:max-w-[760px] sm:rounded-[28px]">
          <DialogHeader className="shrink-0 border-b border-white/8 px-4 py-4 text-left sm:px-5">
            <div className="flex items-center gap-3 pr-9">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white text-black">
                <BrainCircuit className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold tracking-[-0.02em] text-white sm:text-lg">
                  Tradox AI
                </DialogTitle>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {selectedAccount
                    ? `Analyzing ${selectedAccount.name}`
                    : "Select an account to start"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void clearChat()}
                disabled={!messages.length || clearing}
                className="shrink-0 text-zinc-600 hover:bg-rose-400/10 hover:text-rose-300"
                aria-label="Clear chat"
                title="Clear chat"
              >
                {clearing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          </DialogHeader>

          <div className="shrink-0 border-b border-white/8 bg-[#090909] px-4 py-3 sm:px-5">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-10 w-full rounded-xl border-white/10 bg-black px-3 text-sm sm:max-w-[360px]">
                <SelectValue placeholder="Select trading account" />
              </SelectTrigger>
              <SelectContent className="z-[170] border-white/10 bg-[#0b0b0b]">
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}{account.firm ? ` · ${account.firm}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5">
            {historyLoading ? (
              <div className="grid h-full place-items-center text-zinc-600">
                <LoaderCircle className="size-5 animate-spin" />
              </div>
            ) : messages.length ? (
              <div className="space-y-4">
                {messages.map((message) =>
                  message.role === "user" ? (
                    <div key={message.id} className="flex justify-end">
                      <article className="max-w-[88%] rounded-[20px] rounded-br-md bg-white px-4 py-3 text-sm leading-6 text-black shadow-sm sm:max-w-[76%]">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </article>
                    </div>
                  ) : (
                    <div key={message.id} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#101010] text-zinc-300">
                        <Sparkles className="size-3.5" />
                      </span>
                      <article className="max-w-[calc(100%-2.5rem)] rounded-[20px] rounded-tl-md border border-white/8 bg-[#0d0d0d] px-4 py-3 text-sm leading-6 text-zinc-200 sm:max-w-[78%]">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </article>
                    </div>
                  ),
                )}

                {sending ? (
                  <div className="flex items-start gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#101010] text-zinc-300">
                      <Sparkles className="size-3.5" />
                    </span>
                    <div className="flex items-center gap-1.5 rounded-[20px] rounded-tl-md border border-white/8 bg-[#0d0d0d] px-4 py-3">
                      <span className="size-1.5 animate-pulse rounded-full bg-zinc-500" />
                      <span className="size-1.5 animate-pulse rounded-full bg-zinc-500 [animation-delay:120ms]" />
                      <span className="size-1.5 animate-pulse rounded-full bg-zinc-500 [animation-delay:240ms]" />
                    </div>
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>
            ) : (
              <div className="grid min-h-full content-center py-8 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-[20px] border border-white/10 bg-[#0d0d0d] text-white shadow-[0_18px_50px_rgba(0,0,0,.35)]">
                  <BrainCircuit className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-white">
                  Ask about your trading
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-zinc-600">
                  Tradox AI answers from the selected account’s journal and performance data.
                </p>

                <div className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-2">
                  {suggestedQuestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => void sendMessage(item)}
                      disabled={!accountId || sending}
                      className="rounded-full border border-white/10 bg-[#0b0b0b] px-3.5 py-2 text-xs text-zinc-400 transition hover:border-white/20 hover:bg-[#111111] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            className="shrink-0 border-t border-white/8 bg-[#090909] p-3 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            {chatError ? (
              <div className="mb-3 rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-3 py-2 text-xs text-rose-200">
                {chatError}
              </div>
            ) : null}

            <div className="flex items-end gap-2 rounded-[18px] border border-white/10 bg-black p-1.5 focus-within:border-white/20">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, 2000))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                className="max-h-36 min-h-10 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-[16px] leading-6 text-white shadow-none focus-visible:ring-0 sm:text-sm"
                placeholder="Message Tradox AI…"
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !accountId || !question.trim()}
                className="size-10 shrink-0 rounded-[14px] bg-white text-black hover:bg-zinc-200"
                aria-label="Send message"
              >
                {sending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
