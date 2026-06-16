"use client";

import {
  ArrowLeft,
  Check,
  Clock3,
  Edit3,
  EyeOff,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Reply,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { XSpinner } from "./app-loader";
import { useAuth } from "./auth-context";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";
import type { ChatMember, Group, GroupMessage, UserOption } from "./types";

interface MessageRecord {
  id: string;
  group_id: string;
  user_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  reply_to_id: string | null;
  reply_to_name: string | null;
  reply_to_content: string | null;
  created_at: string;
  sender_is_verified?: boolean;
}

type MessageStatus = "sending" | "sent" | "error";

type ChatUiMessage = GroupMessage & {
  status?: MessageStatus;
  clientId?: string;
};

function toMessage(record: MessageRecord): ChatUiMessage {
  return {
    id: record.id,
    groupId: record.group_id,
    userId: record.user_id,
    name: record.sender_name,
    avatar: record.sender_avatar ?? record.sender_name[0] ?? "T",
    text: record.content,
    isVerified: Boolean(record.sender_is_verified),
    createdAt: new Date(record.created_at).toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    replyTo: record.reply_to_id
      ? {
          id: record.reply_to_id,
          name: record.reply_to_name ?? "Trader",
          text: record.reply_to_content ?? "",
        }
      : null,
    status: "sent",
  };
}

function MemberLine({ members = [] }: { members?: ChatMember[] }) {
  if (!members.length) return <>A&apos;zolar hali yuklanmadi</>;

  return (
    <>
      {members.slice(0, 3).map((member, index) => (
        <span key={member.id} className="inline-flex items-center gap-0.5">
          {index > 0 ? <span>,&nbsp;</span> : null}
          <span>{member.name}</span>
          {member.isVerified ? <VerifiedBadge size={10} /> : null}
        </span>
      ))}
      {members.length > 3 ? <span> +{members.length - 3}</span> : null}
    </>
  );
}

function tempId() {
  return `temp-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function userDisplayName(user: NonNullable<ReturnType<typeof useAuth>["user"]>) {
  return String(user.user_metadata.full_name ?? user.user_metadata.name ?? user.email?.split("@")[0] ?? "Trader");
}

function userAvatar(user: NonNullable<ReturnType<typeof useAuth>["user"]>, name: string) {
  const avatar = user.user_metadata.avatar_url;
  return typeof avatar === "string" && avatar ? avatar : name[0] ?? "T";
}

export function ChatV4({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const { user, configured } = useAuth();
  const [chats, setChats] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatUiMessage | null>(null);
  const [chatName, setChatName] = useState("");
  const [query, setQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState("");
  const [selectedAddUserIds, setSelectedAddUserIds] = useState<string[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [hidingChat, setHidingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats],
  );

  const existingMemberIds = useMemo(
    () => new Set(activeChat?.members?.map((member) => member.id) ?? []),
    [activeChat],
  );

  const filteredUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (value.length < 2) return [];
    return users.filter((option) => `${option.name} ${option.username}`.toLowerCase().includes(value));
  }, [query, users]);

  const filteredAddUsers = useMemo(() => {
    const value = addMemberQuery.trim().toLowerCase();
    if (value.length < 2) return [];
    return users.filter(
      (option) =>
        !existingMemberIds.has(option.id) &&
        `${option.name} ${option.username}`.toLowerCase().includes(value),
    );
  }, [addMemberQuery, users, existingMemberIds]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, activeChatId]);

  const loadMessages = useCallback((chatId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);

    return apiRequest<{ messages: MessageRecord[] }>(`/api/chats/${chatId}/messages`)
      .then(({ messages: records }) => {
        const serverMessages = records.map(toMessage);
        setMessages((current) => {
          const optimistic = current.filter(
            (message) => message.status === "sending" || message.status === "error",
          );
          return [...serverMessages, ...optimistic];
        });
      })
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => {
        if (!silent) setLoadingMessages(false);
      });
  }, []);

  useEffect(() => {
    if (!user) return;

    let active = true;
    setLoading(true);
    setError(null);

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
    setAddMembersOpen(false);
    setAddMemberQuery("");
    setSelectedAddUserIds([]);
    setEditingMessageId(null);
    setEditingText("");
    setReplyingTo(null);
    setMessages([]);
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId || !user) return;

    let active = true;
    void loadMessages(activeChatId, false);
    const timer = window.setInterval(() => {
      if (active) void loadMessages(activeChatId, true);
    }, 12000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeChatId, user, loadMessages]);

  const resetCreateForm = () => {
    setChatName("");
    setQuery("");
    setSelectedUserIds([]);
    setCreating(false);
  };

  const resetAddMembersForm = () => {
    setAddMemberQuery("");
    setSelectedAddUserIds([]);
    setAddMembersOpen(false);
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((current) =>
      current.includes(id) ? current.filter((userId) => userId !== id) : [...current, id],
    );
  };

  const toggleAddUser = (id: string) => {
    setSelectedAddUserIds((current) =>
      current.includes(id) ? current.filter((userId) => userId !== id) : [...current, id],
    );
  };

  const createChat = async () => {
    if (!user) return onLogin();

    setLoading(true);
    setError(null);
    try {
      const { chat } = await apiRequest<{ chat: Group }>("/api/chats", {
        method: "POST",
        body: JSON.stringify({ name: chatName.trim(), memberIds: selectedUserIds }),
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

  const hideActiveChat = async () => {
    if (!activeChatId) return;
    if (!window.confirm("Bu chat ro'yxatdan yashirilsinmi?")) return;

    setHidingChat(true);
    setError(null);
    try {
      await apiRequest<{ success: boolean }>(`/api/chats/${activeChatId}/archive`, { method: "POST" });
      setChats((current) => {
        const next = current.filter((chat) => chat.id !== activeChatId);
        setActiveChatId(next[0]?.id ?? null);
        return next;
      });
      setMessages([]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Chat yashirilmadi.");
    } finally {
      setHidingChat(false);
    }
  };

  const addMembers = async () => {
    if (!activeChatId || !selectedAddUserIds.length) return;

    setAddingMembers(true);
    setError(null);
    try {
      const { chat } = await apiRequest<{ chat: Group }>(`/api/chats/${activeChatId}/members`, {
        method: "POST",
        body: JSON.stringify({ memberIds: selectedAddUserIds }),
      });
      setChats((current) => current.map((item) => (item.id === chat.id ? chat : item)));
      resetAddMembersForm();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "A'zo qo'shilmadi.");
    } finally {
      setAddingMembers(false);
    }
  };

  const send = () => {
    const text = messageText.trim();
    if (!text || !activeChatId) return;
    if (configured && !user) return onLogin();
    if (!user) return;

    const senderName = userDisplayName(user);
    const optimisticId = tempId();
    const replySnapshot = replyingTo;
    const optimisticMessage: ChatUiMessage = {
      id: optimisticId,
      clientId: optimisticId,
      groupId: activeChatId,
      userId: user.id,
      name: senderName,
      avatar: userAvatar(user, senderName),
      text,
      createdAt: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
      replyTo: replySnapshot
        ? { id: replySnapshot.id, name: replySnapshot.name, text: replySnapshot.text }
        : null,
      status: "sending",
    };

    setMessages((current) => [...current, optimisticMessage]);
    setMessageText("");
    setReplyingTo(null);
    setError(null);

    apiRequest<{ message: MessageRecord }>(`/api/chats/${activeChatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: text, replyToId: replySnapshot?.id ?? null }),
    })
      .then(({ message }) => {
        const savedMessage = toMessage(message);
        setMessages((current) =>
          current.map((item) => (item.id === optimisticId ? savedMessage : item)),
        );
      })
      .catch((nextError) => {
        setMessages((current) =>
          current.map((item) =>
            item.id === optimisticId ? { ...item, status: "error" as const } : item,
          ),
        );
        setError(nextError instanceof Error ? nextError.message : "Xabar yuborilmadi.");
      });
  };

  const startEditMessage = (message: ChatUiMessage) => {
    if (message.status === "sending") return;
    setEditingMessageId(message.id);
    setEditingText(message.text);
  };

  const saveMessageEdit = async () => {
    if (!editingMessageId || !editingText.trim()) return;

    setSavingEdit(true);
    setError(null);
    try {
      const { message } = await apiRequest<{ message: MessageRecord }>("/api/message-actions", {
        method: "POST",
        body: JSON.stringify({ messageId: editingMessageId, content: editingText.trim() }),
      });
      const nextMessage = toMessage(message);
      setMessages((current) => current.map((item) => (item.id === nextMessage.id ? nextMessage : item)));
      setEditingMessageId(null);
      setEditingText("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Xabar tahrirlanmadi.");
    } finally {
      setSavingEdit(false);
    }
  };

  const renderUserOption = (option: UserOption, selected: boolean, onClick: () => void) => (
    <button
      key={option.id}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-2xl border p-2 text-left transition ${
        selected ? "border-cyan-200/25 bg-cyan-300/10" : "border-transparent bg-white/[.025] hover:bg-white/[.05]"
      }`}
    >
      <TraderAvatar name={option.name} value={option.avatar} className="h-9 w-9 rounded-xl text-[10px]" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <strong className="block truncate text-xs">{option.name}</strong>
          {option.isVerified && <VerifiedBadge size={13} />}
        </span>
        <small className="block truncate text-[10px] text-slate-500">@{option.username}</small>
      </span>
      <span className={`grid h-6 w-6 place-items-center rounded-full border ${selected ? "border-cyan-200 bg-cyan-200 text-slate-950" : "border-white/10 text-transparent"}`}>
        <Check size={13} />
      </span>
    </button>
  );

  const renderReplyPreview = (reply: GroupMessage["replyTo"] | null | undefined) => {
    if (!reply) return null;
    return (
      <div className="mb-2 rounded-2xl border-l-2 border-cyan-300/60 bg-black/18 px-3 py-2 text-left">
        <p className="truncate text-[10px] font-bold text-cyan-200">{reply.name}</p>
        <p className="line-clamp-2 text-[10px] leading-4 text-slate-400">{reply.text}</p>
      </div>
    );
  };

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(14,165,233,.14),transparent_30%),linear-gradient(135deg,#101827,#121527_45%,#171226)] lg:h-[calc(100vh-2rem)] lg:bg-transparent">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-white/[.035] px-3 py-2.5 backdrop-blur-2xl sm:gap-3 sm:px-5 sm:py-3">
        <button onClick={onBack} className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/10 text-slate-200 hover:bg-white/[.06]" aria-label="Orqaga qaytish">
          <ArrowLeft size={17} />
        </button>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[.2em] text-cyan-200/70">TradeX private chat</p>
          <h1 className="truncate text-lg font-black tracking-tight sm:text-2xl">Trader suhbatlari</h1>
        </div>
        <Button onClick={() => setCreating(true)} className="ml-auto h-9 shrink-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 text-[11px] font-bold sm:px-4" size="sm">
          <Plus size={14} /> <span className="hidden sm:inline">Chat yaratish</span>
        </Button>
      </header>

      {error && <div className="mx-3 mt-2 shrink-0 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-2 text-xs text-rose-200 backdrop-blur-xl">{error}</div>}

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
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 p-2 sm:gap-3 sm:p-3 md:grid-cols-[330px_1fr]">
          <aside className={`${activeChat ? "hidden md:flex" : "flex"} min-h-0 flex-col rounded-[24px] border border-white/10 bg-white/[.04] p-2 shadow-xl shadow-slate-950/10 backdrop-blur-2xl sm:rounded-[28px] sm:p-3`}>
            <div className="flex shrink-0 items-center gap-2 px-2 py-2">
              <MessageSquareText size={16} className="text-cyan-200" />
              <strong className="text-sm">Mening chatlarim</strong>
              <span className="ml-auto rounded-full bg-white/[.06] px-2 py-0.5 text-[10px] text-slate-400">{chats.length}</span>
            </div>

            {(creating || chats.length === 0) && (
              <div className="mt-2 shrink-0 rounded-[22px] border border-cyan-200/12 bg-cyan-300/[.055] p-3">
                <div className="flex items-center gap-2">
                  <UserPlus size={15} className="text-cyan-200" />
                  <strong className="text-xs">Yangi chat</strong>
                  {chats.length > 0 && (
                    <button onClick={resetCreateForm} className="ml-auto grid h-7 w-7 place-items-center rounded-xl text-slate-500 hover:bg-white/[.06]" aria-label="Yopish">
                      <X size={15} />
                    </button>
                  )}
                </div>
                <input value={chatName} onChange={(event) => setChatName(event.target.value)} placeholder="Chat nomi" className="mt-3 h-10 w-full rounded-2xl border border-white/10 bg-black/15 px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/25" />
                <label className="mt-2 flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 text-slate-500">
                  <Search size={14} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Foydalanuvchi izlash" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500" />
                </label>
                <div className="mt-3 max-h-52 space-y-1 overflow-y-auto pr-1">
                  {filteredUsers.map((option) => renderUserOption(option, selectedUserIds.includes(option.id), () => toggleUser(option.id)))}
                  {query.trim().length < 2 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-3 text-center text-[11px] leading-5 text-slate-500">Foydalanuvchi qidirish uchun kamida 2 ta harf yozing.</div>
                  ) : !filteredUsers.length ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-3 text-center text-[11px] leading-5 text-slate-500">Bunday foydalanuvchi topilmadi.</div>
                  ) : null}
                </div>
                <Button disabled={loading} onClick={() => void createChat()} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold">
                  {loading ? <XSpinner size="sm" /> : <Plus size={14} />} Chat yaratish
                </Button>
              </div>
            )}

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {loading && !chats.length && <div className="grid h-32 place-items-center text-xs text-slate-500"><XSpinner />Chatlar yuklanmoqda</div>}
              {!loading && !chats.length && (
                <div className="grid h-44 place-items-center rounded-[24px] border border-dashed border-white/10 p-5 text-center">
                  <div><Users className="mx-auto text-slate-600" size={28} /><p className="mt-3 text-sm font-bold">Hali chat yo&apos;q</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Ro&apos;yxatdan o&apos;tgan traderlarni tanlab birinchi chatni yarating.</p></div>
                </div>
              )}
              {chats.map((chat) => {
                const selected = chat.id === activeChatId;
                return (
                  <button key={chat.id} onClick={() => setActiveChatId(chat.id)} className={`w-full rounded-[22px] border p-3 text-left transition ${selected ? "border-cyan-200/25 bg-white/[.075]" : "border-white/6 bg-black/8 hover:border-white/12 hover:bg-white/[.04]"}`}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/18 to-violet-500/16 text-xs font-black text-cyan-100">{chat.avatar}</span>
                      <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{chat.name}</strong><small className="block truncate text-[10px] text-slate-500"><MemberLine members={chat.members} /></small></span>
                      <ShieldCheck size={16} className="text-emerald-300/70" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-500">{chat.description}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={`${activeChat ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/[.035] shadow-xl shadow-slate-950/10 backdrop-blur-2xl sm:rounded-[28px]`}>
            {activeChat ? (
              <>
                <div className="flex shrink-0 items-center gap-2 border-b border-white/8 px-2.5 py-2.5 sm:px-4 sm:py-3">
                  <button onClick={() => setActiveChatId(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/10 text-slate-300 md:hidden" aria-label="Chatlar ro'yxatiga qaytish"><ArrowLeft size={17} /></button>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-xs font-black text-cyan-100 sm:h-10 sm:w-10">{activeChat.avatar}</span>
                  <div className="min-w-0"><h2 className="truncate text-sm font-bold sm:text-base">{activeChat.name}</h2><p className="truncate text-[10px] text-slate-500"><MemberLine members={activeChat.members} /></p></div>
                  <Button onClick={() => setAddMembersOpen((value) => !value)} size="sm" className="ml-auto h-9 shrink-0 rounded-2xl bg-white/[.06] px-2 text-[10px] font-bold text-cyan-100 hover:bg-white/[.1] sm:px-3"><UserPlus size={13} /> <span className="hidden sm:inline">A&apos;zo qo&apos;shish</span></Button>
                  <Button disabled={hidingChat} onClick={() => void hideActiveChat()} size="sm" className="h-9 shrink-0 rounded-2xl bg-rose-400/10 px-2 text-[10px] font-bold text-rose-200 hover:bg-rose-400/15 sm:px-3">{hidingChat ? <XSpinner size="sm" /> : <EyeOff size={13} />} <span className="hidden sm:inline">Yashirish</span></Button>
                </div>

                {addMembersOpen && (
                  <div className="shrink-0 border-b border-white/8 bg-black/10 p-2 sm:p-4">
                    <div className="rounded-[22px] border border-cyan-200/12 bg-cyan-300/[.055] p-3">
                      <div className="flex items-center gap-2"><UserPlus size={15} className="text-cyan-200" /><strong className="text-xs">Chatga odam qo&apos;shish</strong><button onClick={resetAddMembersForm} className="ml-auto grid h-7 w-7 place-items-center rounded-xl text-slate-500 hover:bg-white/[.06]" aria-label="Yopish"><X size={15} /></button></div>
                      <label className="mt-3 flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 text-slate-500"><Search size={14} /><input value={addMemberQuery} onChange={(event) => setAddMemberQuery(event.target.value)} placeholder="Qo&apos;shiladigan userni izlash" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500" /></label>
                      <div className="mt-3 max-h-40 space-y-1 overflow-y-auto pr-1 sm:max-h-52">
                        {filteredAddUsers.map((option) => renderUserOption(option, selectedAddUserIds.includes(option.id), () => toggleAddUser(option.id)))}
                        {addMemberQuery.trim().length < 2 ? <div className="rounded-2xl border border-dashed border-white/10 p-3 text-center text-[11px] leading-5 text-slate-500">Qo&apos;shish uchun kamida 2 ta harf yozing.</div> : !filteredAddUsers.length ? <div className="rounded-2xl border border-dashed border-white/10 p-3 text-center text-[11px] leading-5 text-slate-500">Bunday user topilmadi yoki u allaqachon chatda bor.</div> : null}
                      </div>
                      <Button disabled={addingMembers || !selectedAddUserIds.length} onClick={() => void addMembers()} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold">{addingMembers ? <XSpinner size="sm" /> : <UserPlus size={14} />} Tanlanganlarni qo&apos;shish</Button>
                    </div>
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3 sm:px-5 sm:py-4">
                  {loadingMessages && !messages.length && <div className="grid h-full place-items-center text-xs text-slate-500"><XSpinner />Xabarlar yuklanmoqda</div>}
                  {!loadingMessages && !messages.length && <div className="grid h-full min-h-64 place-items-center text-center"><div><MessageSquareText className="mx-auto text-slate-600" size={34} /><p className="mt-3 text-sm font-bold">Suhbat endi boshlandi</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Birinchi xabarni yuboring.</p></div></div>}
                  <div className="space-y-3 pb-1">
                    {messages.map((message) => {
                      const own = message.userId === user.id;
                      const editing = editingMessageId === message.id;
                      const sendingMessage = message.status === "sending";
                      const failedMessage = message.status === "error";
                      return (
                        <article key={message.id} className={`flex gap-2 sm:gap-3 ${own ? "flex-row-reverse" : ""}`}>
                          <TraderAvatar name={message.name} value={message.avatar} className="h-8 w-8 shrink-0 rounded-2xl text-[10px] sm:h-9 sm:w-9" />
                          <div className={`${own ? "text-right" : ""} max-w-[86%] sm:max-w-[78%]`}>
                            <div className={`mb-1 flex items-center gap-2 ${own ? "justify-end" : ""}`}>
                              <span className="inline-flex items-center gap-1">
                                <strong className="text-[10px]">{own ? "Siz" : message.name}</strong>
                                {message.isVerified ? <VerifiedBadge size={11} /> : null}
                              </span>
                              <span className="text-[9px] text-slate-600">{message.createdAt}</span>
                              {!sendingMessage && <button onClick={() => setReplyingTo(message)} className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 hover:bg-white/[.06] hover:text-cyan-200" aria-label="Reply"><Reply size={12} /></button>}
                              {own && !editing && !sendingMessage && !failedMessage && <button onClick={() => startEditMessage(message)} className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 hover:bg-white/[.06] hover:text-cyan-200" aria-label="Xabarni tahrirlash"><Edit3 size={12} /></button>}
                            </div>
                            {editing ? (
                              <div className="rounded-[20px] border border-cyan-200/18 bg-cyan-400/10 p-2">
                                <textarea value={editingText} onChange={(event) => setEditingText(event.target.value)} className="min-h-20 w-full resize-none bg-transparent p-2 text-left text-xs text-white outline-none" />
                                <div className="mt-2 flex justify-end gap-2"><Button onClick={() => { setEditingMessageId(null); setEditingText(""); }} size="sm" className="rounded-xl bg-white/[.06] text-xs">Bekor</Button><Button disabled={savingEdit || !editingText.trim()} onClick={() => void saveMessageEdit()} size="sm" className="rounded-xl bg-cyan-300 text-xs text-slate-950">{savingEdit ? <XSpinner size="sm" /> : <Check size={13} />} Saqlash</Button></div>
                              </div>
                            ) : (
                              <div>
                                {renderReplyPreview(message.replyTo)}
                                <p className={`break-words rounded-[20px] px-3.5 py-2.5 text-left text-[13px] leading-5 shadow-lg shadow-slate-950/10 sm:text-xs ${own ? "rounded-tr-md border border-cyan-200/18 bg-cyan-400/15 text-cyan-50" : "rounded-tl-md border border-white/8 bg-white/[.055] text-slate-200"}`}>{message.text}</p>
                                {own && sendingMessage && <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-500"><Clock3 size={11} className="animate-spin" /> Yuborilmoqda</div>}
                                {own && failedMessage && <div className="mt-1 text-right text-[9px] text-rose-300">Yuborilmadi</div>}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                </div>

                <div className="shrink-0 border-t border-white/8 bg-[#101827]/90 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4">
                  {replyingTo && <div className="mb-2 flex items-start gap-2 rounded-2xl border border-cyan-200/12 bg-cyan-300/[.055] px-3 py-2"><Reply className="mt-0.5 shrink-0 text-cyan-200" size={14} /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-cyan-100">{replyingTo.name} ga reply</p><p className="truncate text-[11px] text-slate-400">{replyingTo.text}</p></div><button onClick={() => setReplyingTo(null)} className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 hover:bg-white/[.06]" aria-label="Replyni bekor qilish"><X size={13} /></button></div>}
                  <div className="flex items-end gap-2 rounded-[22px] border border-white/10 bg-black/18 p-1.5 backdrop-blur-xl focus-within:border-cyan-200/25 sm:p-2">
                    <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows={1} placeholder={`${activeChat.name} uchun xabar...`} className="max-h-24 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[16px] leading-5 text-white outline-none placeholder:text-slate-600 sm:max-h-28 sm:min-h-10 sm:text-xs" />
                    <Button disabled={!messageText.trim()} onClick={send} size="icon-sm" className="h-9 w-9 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 sm:h-10 sm:w-10" aria-label="Yuborish"><Send size={15} /></Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-6 text-center"><div><MessageSquareText className="mx-auto text-slate-600" size={40} /><h2 className="mt-4 text-lg font-black">Chat tanlang yoki yangisini yarating</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Bu yerda faqat siz yaratgan yoki siz qo&apos;shilgan private chatlar ko&apos;rinadi.</p><Button onClick={() => setCreating(true)} className="mt-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600"><Plus size={15} /> Chat yaratish</Button></div></div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
