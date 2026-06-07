"use client";

import {
  ArrowLeft,
  Check,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-context";
import { TraderAvatar } from "./trader-avatar";
import type { ChatMember, Group, GroupMessage, UserOption } from "./types";

interface MessageRecord {
  id: string;
  group_id: string;
  user_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
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

function memberLine(members: ChatMember[] = []) {
  if (!members.length) return "A'zolar hali yuklanmadi";
  return members
    .slice(0, 3)
    .map((member) => member.name)
    .join(", ");
}

export function Chat({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const { user, configured } = useAuth();
  const [chats, setChats] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [chatName, setChatName] = useState("");
  const [query, setQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats],
  );

const filteredUsers = useMemo(() => {
  const value = query.trim().toLowerCase();

  if (value.length < 2) return [];

  return users.filter((option) =>
    `${option.name} ${option.username}`.toLowerCase().includes(value),
  );
}, [query, users]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
    });

    Promise.all([
      apiRequest<{ chats: Group[] }>("/api/chats"),
      apiRequest<{ users: UserOption[] }>("/api/users"),
    ])
      .then(([chatsResponse, usersResponse]) => {
        if (!active) return;
        setChats(chatsResponse.chats);
        setUsers(usersResponse.users);
        setActiveChatId((current) => current ?? chatsResponse.chats[0]?.id ?? null);
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!activeChatId || !user) {
      return;
    }

    let active = true;
    const loadMessages = () => {
      setLoadingMessages(true);
      return apiRequest<{ messages: MessageRecord[] }>(`/api/chats/${activeChatId}/messages`)
        .then(({ messages: records }) => {
          if (active) setMessages(records.map(toMessage));
        })
        .catch((nextError: Error) => {
          if (active) setError(nextError.message);
        })
        .finally(() => {
          if (active) setLoadingMessages(false);
        });
    };

    void loadMessages();
    const timer = window.setInterval(loadMessages, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeChatId, user]);

  const toggleUser = (id: string) => {
    setSelectedUserIds((current) =>
      current.includes(id)
        ? current.filter((userId) => userId !== id)
        : [...current, id],
    );
  };

  const resetCreateForm = () => {
    setChatName("");
    setQuery("");
    setSelectedUserIds([]);
    setCreating(false);
  };

  const createChat = async () => {
    if (!user) {
      onLogin();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { chat } = await apiRequest<{ chat: Group }>("/api/chats", {
        method: "POST",
        body: JSON.stringify({
          name: chatName.trim(),
          memberIds: selectedUserIds,
        }),
      });
      setChats((current) => [chat, ...current.filter((item) => item.id !== chat.id)]);
      setActiveChatId(chat.id);
      resetCreateForm();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Chat yaratilmadi.");
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!messageText.trim() || !activeChatId) return;
    if (configured && !user) {
      onLogin();
      return;
    }

    setSending(true);
    setError(null);
    try {
      const { message } = await apiRequest<{ message: MessageRecord }>(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: messageText.trim() }),
      });
      setMessages((current) => [...current, toMessage(message)]);
      setMessageText("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Xabar yuborilmadi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen flex-col bg-[radial-gradient(circle_at_15%_15%,rgba(14,165,233,.14),transparent_30%),linear-gradient(135deg,#101827,#121527_45%,#171226)] lg:h-[calc(100vh-2rem)] lg:min-h-[680px] lg:bg-transparent">
      <header className="flex items-center gap-3 border-b border-white/8 bg-white/[.035] px-4 py-3 backdrop-blur-2xl sm:px-5">
        <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-black/10 text-slate-200 hover:bg-white/[.06]" aria-label="Orqaga qaytish">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200/70">Private chat</p>
          <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">Trader suhbatlari</h1>
        </div>
        <Button onClick={() => setCreating(true)} className="ml-auto rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 text-xs font-bold sm:px-4" size="sm">
          <Plus size={15} /> <span className="hidden sm:inline">Chat yaratish</span>
        </Button>
      </header>

      {error && <div className="mx-4 mt-3 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-2 text-xs text-rose-200 backdrop-blur-xl">{error}</div>}

      {!user ? (
        <div className="grid flex-1 place-items-center p-4">
          <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-white/[.045] p-6 text-center shadow-2xl shadow-slate-950/20 backdrop-blur-2xl">
            <LockKeyhole className="mx-auto text-cyan-200" size={34} />
            <h2 className="mt-4 text-xl font-black">Chatlar account bilan ishlaydi</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Ro&apos;yxatdan o&apos;tgan traderlarni qo&apos;shish va xabarlarni saqlash uchun Google orqali kiring.</p>
            <Button onClick={onLogin} className="mt-5 w-full rounded-2xl bg-white text-slate-950 hover:bg-slate-100">Google orqali kirish</Button>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-[330px_1fr]">
          <aside className={`${activeChat ? "hidden md:flex" : "flex"} min-h-0 flex-col rounded-[28px] border border-white/10 bg-white/[.04] p-3 shadow-xl shadow-slate-950/10 backdrop-blur-2xl`}>
            <div className="flex items-center gap-2 px-2 py-2">
              <MessageSquareText size={16} className="text-cyan-200" />
              <strong className="text-sm">Mening chatlarim</strong>
              <span className="ml-auto rounded-full bg-white/[.06] px-2 py-0.5 text-[10px] text-slate-400">{chats.length}</span>
            </div>

            {(creating || chats.length === 0) && (
              <div className="mt-2 rounded-[24px] border border-cyan-200/12 bg-cyan-300/[.055] p-3">
                <div className="flex items-center gap-2">
                  <UserPlus size={15} className="text-cyan-200" />
                  <strong className="text-xs">Yangi chat</strong>
                  {chats.length > 0 && (
                    <button onClick={resetCreateForm} className="ml-auto grid h-7 w-7 place-items-center rounded-xl text-slate-500 hover:bg-white/[.06]" aria-label="Yopish">
                      <X size={15} />
                    </button>
                  )}
                </div>
                <input
                  value={chatName}
                  onChange={(event) => setChatName(event.target.value)}
                  placeholder="Chat nomi, masalan: London session"
                  className="mt-3 h-10 w-full rounded-2xl border border-white/10 bg-black/15 px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/25"
                />
                <label className="mt-2 flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 text-slate-500">
                  <Search size={14} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Foydalanuvchi izlash" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500" />
                </label>
                <div className="mt-3 max-h-52 space-y-1 overflow-y-auto pr-1">
                  {filteredUsers.map((option) => {
                    const selected = selectedUserIds.includes(option.id);
                    return (
                      <button key={option.id} onClick={() => toggleUser(option.id)} className={`flex w-full items-center gap-2 rounded-2xl border p-2 text-left transition ${selected ? "border-cyan-200/25 bg-cyan-300/10" : "border-transparent bg-white/[.025] hover:bg-white/[.05]"}`}>
                        <TraderAvatar name={option.name} value={option.avatar} className="h-9 w-9 rounded-xl text-[10px]" />
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-xs">{option.name}</strong>
                          <small className="block truncate text-[10px] text-slate-500">@{option.username}</small>
                        </span>
                        <span className={`grid h-6 w-6 place-items-center rounded-full border ${selected ? "border-cyan-200 bg-cyan-200 text-slate-950" : "border-white/10 text-transparent"}`}>
                          <Check size={13} />
                        </span>
                      </button>
                    );
                  })}
                  {!filteredUsers.length && (
                    <div className="rounded-2xl border border-dashed border-white/10 p-3 text-center text-[11px] leading-5 text-slate-500">
                      Ro&apos;yxatdan o&apos;tgan boshqa foydalanuvchi topilmadi. Nom yozib shaxsiy chat yaratishingiz mumkin.
                    </div>
                  )}
                </div>
                <Button disabled={loading} onClick={() => void createChat()} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold">
                  {loading ? <LoaderCircle className="animate-spin" size={14} /> : <Plus size={14} />} Chat yaratish
                </Button>
              </div>
            )}

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {loading && !chats.length && (
                <div className="grid h-32 place-items-center text-xs text-slate-500">
                  <LoaderCircle className="mb-2 animate-spin" size={22} />
                  Chatlar yuklanmoqda
                </div>
              )}
              {!loading && !chats.length && (
                <div className="grid h-44 place-items-center rounded-[24px] border border-dashed border-white/10 p-5 text-center">
                  <div>
                    <Users className="mx-auto text-slate-600" size={28} />
                    <p className="mt-3 text-sm font-bold">Hali chat yo&apos;q</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">Ro&apos;yxatdan o&apos;tgan traderlarni tanlab birinchi chatni yarating.</p>
                  </div>
                </div>
              )}
              {chats.map((chat) => {
                const selected = chat.id === activeChatId;
                return (
                  <button key={chat.id} onClick={() => setActiveChatId(chat.id)} className={`w-full rounded-[22px] border p-3 text-left transition ${selected ? "border-cyan-200/25 bg-white/[.075]" : "border-white/6 bg-black/8 hover:border-white/12 hover:bg-white/[.04]"}`}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/18 to-violet-500/16 text-xs font-black text-cyan-100">{chat.avatar}</span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">{chat.name}</strong>
                        <small className="block truncate text-[10px] text-slate-500">{memberLine(chat.members)}</small>
                      </span>
                      <ShieldCheck size={16} className="text-emerald-300/70" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-500">{chat.description}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={`${activeChat ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[.035] shadow-xl shadow-slate-950/10 backdrop-blur-2xl`}>
            {activeChat ? (
              <>
                <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
                  <button onClick={() => setActiveChatId(null)} className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-black/10 text-slate-300 md:hidden" aria-label="Chatlar ro'yxatiga qaytish">
                    <ArrowLeft size={17} />
                  </button>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-xs font-black text-cyan-100">{activeChat.avatar}</span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold sm:text-base">{activeChat.name}</h2>
                    <p className="truncate text-[10px] text-slate-500">{memberLine(activeChat.members)}</p>
                  </div>
                  <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-300/12 bg-emerald-300/7 px-2.5 py-1 text-[10px] font-bold text-emerald-200 sm:flex">
                    <ShieldCheck size={12} /> Private
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
                  {loadingMessages && !messages.length && (
                    <div className="grid h-full place-items-center text-xs text-slate-500">
                      <LoaderCircle className="mb-2 animate-spin" size={24} />
                      Xabarlar yuklanmoqda
                    </div>
                  )}
                  {!loadingMessages && !messages.length && (
                    <div className="grid h-full min-h-64 place-items-center text-center">
                      <div>
                        <MessageSquareText className="mx-auto text-slate-600" size={34} />
                        <p className="mt-3 text-sm font-bold">Suhbat endi boshlandi</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">Birinchi xabarni yuboring. Signal bo&apos;lsa, risk va invalidation nuqtasini ham yozing.</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const own = message.userId === user.id;
                      return (
                        <article key={message.id} className={`flex gap-3 ${own ? "flex-row-reverse" : ""}`}>
                          <TraderAvatar name={message.name} value={message.avatar} className="h-9 w-9 rounded-2xl text-[10px]" />
                          <div className={`max-w-[82%] ${own ? "text-right" : ""}`}>
                            <div className={`mb-1 flex items-center gap-2 ${own ? "justify-end" : ""}`}>
                              <strong className="text-[10px]">{own ? "Siz" : message.name}</strong>
                              <span className="text-[9px] text-slate-600">{message.createdAt}</span>
                            </div>
                            <p className={`rounded-[20px] px-3.5 py-2.5 text-left text-xs leading-5 shadow-lg shadow-slate-950/10 ${own ? "rounded-tr-md border border-cyan-200/18 bg-cyan-400/15 text-cyan-50" : "rounded-tl-md border border-white/8 bg-white/[.055] text-slate-200"}`}>
                              {message.text}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-white/8 p-3 sm:p-4">
                  <div className="flex items-end gap-2 rounded-[22px] border border-white/10 bg-black/14 p-2 backdrop-blur-xl focus-within:border-cyan-200/25">
                    <textarea
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void send();
                        }
                      }}
                      rows={1}
                      placeholder={`${activeChat.name} uchun xabar...`}
                      className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-xs text-white outline-none placeholder:text-slate-600"
                    />
                    <Button disabled={sending || !messageText.trim()} onClick={() => void send()} size="icon-sm" className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600" aria-label="Yuborish">
                      {sending ? <LoaderCircle className="animate-spin" size={15} /> : <Send size={15} />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-6 text-center">
                <div>
                  <MessageSquareText className="mx-auto text-slate-600" size={40} />
                  <h2 className="mt-4 text-lg font-black">Chat tanlang yoki yangisini yarating</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Bu yerda faqat siz yaratgan yoki siz qo&apos;shilgan private chatlar ko&apos;rinadi.</p>
                  <Button onClick={() => setCreating(true)} className="mt-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600">
                    <Plus size={15} /> Chat yaratish
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
