"use client";

import {
  Bell,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  Pin,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-context";
import { TraderAvatar } from "./trader-avatar";
import type { Group, GroupMessage } from "./types";

const demoGroups: Group[] = [
  { id: "crypto", name: "Crypto Uzbekistan", description: "Kripto bozor tahlili va savdo g'oyalari", avatar: "CU" },
  { id: "forex", name: "Forex Masters", description: "Forex traderlar uchun muhokama", avatar: "FX" },
  { id: "price", name: "Price Action", description: "Toza grafik va setup'lar", avatar: "PA" },
  { id: "algo", name: "Algo Traders", description: "Algoritmik trading va backtesting", avatar: "AI" },
];

const demoMessages: GroupMessage[] = [
  { id: "m1", groupId: "crypto", name: "Sardor Capital", avatar: "SC", text: "Assalomu alaykum, traderlar! BTC 104k ustida yopilsa long setup qidiraman.", createdAt: "14:24" },
  { id: "m2", groupId: "crypto", name: "Malika FX", avatar: "M", text: "Volume ham yaxshi ko'rinyapti, lekin retest kutgan ma'qul. Riskni pasaytiring.", createdAt: "14:27" },
  { id: "m3", groupId: "crypto", name: "Quant Uz", avatar: "QU", text: "Funding rate neytral. Hozircha breakout sog'lom ko'rinyapti.", createdAt: "14:31" },
];

const members = [
  { name: "Sardor Capital", status: "BTC tahlil qilmoqda", avatar: "SC" },
  { name: "Malika FX", status: "London session", avatar: "MF" },
  { name: "Quant Uz", status: "Backtest ishlayapti", avatar: "QU" },
  { name: "Akmal Crypto", status: "Online", avatar: "AK" },
];

interface GroupRecord {
  id: string;
  name: string;
  description: string;
  avatar: string;
}

interface MessageRecord {
  id: string;
  group_id: string;
  user_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

function isDatabaseId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toMessage(record: MessageRecord): GroupMessage {
  return {
    id: record.id,
    groupId: record.group_id,
    userId: record.user_id,
    name: record.sender_name,
    avatar: record.sender_avatar ?? record.sender_name[0] ?? "T",
    text: record.content,
    createdAt: new Date(record.created_at).toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function Chat({ onLogin }: { onLogin: () => void }) {
  const { user, configured } = useAuth();
  const [groups, setGroups] = useState<Group[]>(demoGroups);
  const [activeGroupId, setActiveGroupId] = useState(demoGroups[0].id);
  const [messages, setMessages] = useState<GroupMessage[]>(demoMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? groups[0],
    [activeGroupId, groups],
  );

  useEffect(() => {
    apiRequest<{ groups: GroupRecord[] }>("/api/groups")
      .then(({ groups: cloudGroups }) => {
        if (!cloudGroups.length) return;
        setGroups(cloudGroups);
        setActiveGroupId(cloudGroups[0].id);
        setError(null);
      })
      .catch((nextError: Error) => setError(nextError.message));
  }, []);

  useEffect(() => {
    if (!activeGroupId || !isDatabaseId(activeGroupId)) return;
    let active = true;
    const load = () => apiRequest<{ messages: MessageRecord[] }>(`/api/groups/${activeGroupId}/messages`)
      .then(({ messages: records }) => {
        if (active) setMessages(records.map(toMessage));
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      });
    void load();
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeGroupId]);

  const send = async () => {
    if (!text.trim()) return;
    if (configured && !user) {
      onLogin();
      return;
    }
    setSending(true);
    try {
      const { message } = await apiRequest<{ message: MessageRecord }>(`/api/groups/${activeGroupId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text.trim() }),
      });
      setMessages((current) => [...current, toMessage(message)]);
      setText("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Xabar yuborilmadi.");
    } finally {
      setSending(false);
    }
  };

  const visibleMessages = messages.filter((message) => message.groupId === activeGroupId);

  return (
    <div className="flex min-h-screen flex-col lg:h-[calc(100vh-2rem)] lg:min-h-[680px]">
      <header className="flex items-center border-b border-white/8 bg-[#0b1424]/35 px-5 py-4 backdrop-blur-2xl">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-violet-300/70">Live collaboration</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Trading Rooms</h1>
        </div>
        <label className="ml-auto hidden h-10 w-52 items-center gap-2 rounded-2xl border border-white/8 bg-white/[.035] px-3 text-slate-500 md:flex">
          <Search size={15} />
          <input placeholder="Xabarlardan izlash" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none" />
        </label>
        <button className="ml-2 grid h-10 w-10 place-items-center rounded-2xl border border-white/8 bg-white/[.035] text-slate-400" aria-label="Bildirishnomalar"><Bell size={17} /></button>
      </header>

      {error && <div className="mx-4 mt-3 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-2 text-xs text-rose-200 backdrop-blur-xl">{error}</div>}

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <aside className="hidden w-[250px] shrink-0 flex-col rounded-[24px] border border-white/9 bg-white/[.035] p-3 backdrop-blur-2xl md:flex">
          <div className="flex items-center px-2 py-2">
            <MessageSquareText size={16} className="text-cyan-300" />
            <strong className="ml-2 text-xs">Roomlar</strong>
            <span className="ml-auto rounded-full bg-white/[.05] px-2 py-0.5 text-[9px] text-slate-500">{groups.length}</span>
          </div>
          <div className="mt-2 space-y-2 overflow-y-auto">
            {groups.map((group, index) => {
              const active = group.id === activeGroupId;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-cyan-300/20 bg-gradient-to-br from-blue-500/16 to-violet-500/10"
                      : "border-transparent bg-black/5 hover:border-white/8 hover:bg-white/[.035]"
                  }`}
                >
                  <div className="flex items-center">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-cyan-300/15 text-cyan-200" : "bg-white/[.05] text-slate-400"}`}>{group.avatar}</span>
                    <div className="ml-3 min-w-0">
                      <strong className="block truncate text-xs">{group.name}</strong>
                      <small className="text-[9px] text-slate-500">{index + 2} faol trader</small>
                    </div>
                    <ChevronRight className="ml-auto text-slate-600" size={15} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-500">{group.description}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-auto rounded-2xl border border-white/8 bg-black/10 p-3">
            <div className="flex items-center gap-2 text-violet-200"><Sparkles size={14} /><strong className="text-[10px]">Room qoidasi</strong></div>
            <p className="mt-2 text-[9px] leading-4 text-slate-500">Signal yuborsangiz, risk va invalidation nuqtasini ham yozing.</p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-white/9 bg-white/[.028] backdrop-blur-2xl">
          <div className="flex items-center border-b border-white/8 px-4 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-xs font-black text-cyan-200">{activeGroup?.avatar}</span>
            <div className="ml-3 min-w-0">
              <h2 className="truncate text-sm font-bold">{activeGroup?.name}</h2>
              <p className="truncate text-[10px] text-slate-500">{activeGroup?.description}</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-300/8 px-2.5 py-1 text-[9px] font-bold text-emerald-300"><Users size={11} /> {members.length} online</span>
            <button className="ml-2 grid h-8 w-8 place-items-center rounded-xl text-slate-500 hover:bg-white/[.05]" aria-label="Room menyusi"><MoreHorizontal size={17} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            <div className="mb-6 rounded-[22px] border border-cyan-300/12 bg-gradient-to-r from-cyan-300/7 to-violet-400/7 p-4">
              <div className="flex items-center gap-2 text-cyan-200"><Pin size={14} /><strong className="text-xs">Room context</strong></div>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">Bu yerda setup, chart kuzatuvi va bozor fikrlarini real vaqtda muhokama qilasiz.</p>
            </div>

            {!visibleMessages.length && (
              <div className="grid min-h-48 place-items-center text-center">
                <div>
                  <MessageSquareText className="mx-auto text-slate-600" size={30} />
                  <p className="mt-3 text-sm font-bold">{"Suhbatni birinchi bo'lib boshlang"}</p>
                  <p className="mt-1 text-[10px] text-slate-500">Room hali sokin.</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {visibleMessages.map((message) => {
                const own = message.userId === user?.id;
                return (
                  <article key={message.id} className={`flex gap-3 ${own ? "flex-row-reverse" : ""}`}>
                    <TraderAvatar name={message.name} value={message.avatar} className="h-9 w-9 rounded-xl text-[10px]" />
                    <div className={`max-w-[78%] ${own ? "text-right" : ""}`}>
                      <div className={`mb-1 flex items-center gap-2 ${own ? "justify-end" : ""}`}>
                        <strong className="text-[10px]">{own ? "Siz" : message.name}</strong>
                        <span className="text-[9px] text-slate-600">{message.createdAt}</span>
                      </div>
                      <p className={`rounded-2xl px-3.5 py-2.5 text-left text-xs leading-5 shadow-lg shadow-slate-950/10 ${
                        own
                          ? "rounded-tr-md border border-blue-300/15 bg-blue-500/16 text-blue-50"
                          : "rounded-tl-md border border-white/8 bg-white/[.045] text-slate-200"
                      }`}>{message.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {configured && !user && (
              <button onClick={onLogin} className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/15 bg-amber-300/7 py-2 text-[10px] font-bold text-amber-200">
                <LockKeyhole size={13} /> Xabar yozish uchun Google bilan kiring
              </button>
            )}
            <div className="flex items-end gap-2 rounded-[20px] border border-white/10 bg-black/12 p-2 backdrop-blur-xl focus-within:border-blue-300/25">
              <button className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white/[.05] hover:text-white" aria-label="Fayl biriktirish"><Paperclip size={17} /></button>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder={`${activeGroup?.name ?? "Room"} uchun xabar...`}
                className="max-h-28 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-2 text-xs text-white outline-none placeholder:text-slate-600"
              />
              <button className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white/[.05] hover:text-white" aria-label="Rasm qo'shish"><ImagePlus size={17} /></button>
              <Button disabled={sending || !text.trim()} onClick={() => void send()} size="icon-sm" className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600" aria-label="Yuborish">
                {sending ? <LoaderCircle className="animate-spin" size={15} /> : <Send size={15} />}
              </Button>
            </div>
          </div>
        </section>

        <aside className="hidden w-[220px] shrink-0 rounded-[24px] border border-white/9 bg-white/[.03] p-3 backdrop-blur-2xl 2xl:block">
          <div className="flex items-center px-2 py-2">
            <Users size={15} className="text-violet-300" />
            <strong className="ml-2 text-xs">Faol traderlar</strong>
          </div>
          <div className="mt-2 space-y-1">
            {members.map((member) => (
              <button key={member.name} className="flex w-full items-center rounded-2xl p-2 text-left hover:bg-white/[.04]">
                <span className="relative">
                  <TraderAvatar name={member.name} value={member.avatar} className="h-9 w-9 rounded-xl text-[9px]" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#172033] bg-emerald-300" />
                </span>
                <span className="ml-2 min-w-0">
                  <strong className="block truncate text-[10px]">{member.name}</strong>
                  <small className="block truncate text-[9px] text-slate-600">{member.status}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
