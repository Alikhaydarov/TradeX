"use client";

import {
  Bell,
  ChevronDown,
  Gift,
  Hash,
  Headphones,
  HelpCircle,
  ImagePlus,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  Mic,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  Sticker,
  UserPlus,
  Users,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-context";
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
  { name: "Sardor Capital", status: "BTC tahlil qilmoqda", avatar: "SC", color: "bg-emerald-500" },
  { name: "Malika FX", status: "London session", avatar: "M", color: "bg-fuchsia-500" },
  { name: "Quant Uz", status: "Backtest ishlayapti", avatar: "QU", color: "bg-sky-500" },
  { name: "Akmal Crypto", status: "Online", avatar: "AK", color: "bg-amber-500" },
  { name: "Trader Bek", status: "Idle", avatar: "TB", color: "bg-indigo-500" },
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

function ServerRail({
  groups,
  activeGroupId,
  onSelect,
}: {
  groups: Group[];
  activeGroupId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-2 bg-[#1e1f22] py-3 sm:flex">
      <button className="group flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#5865f2] font-black text-white transition hover:rounded-[12px]" aria-label="TradeX chat">
        TX
      </button>
      <div className="h-0.5 w-8 bg-white/10" />
      {groups.map((group) => {
        const active = group.id === activeGroupId;
        return (
          <div key={group.id} className="relative">
            {active && <span className="absolute -left-3 top-1/2 h-10 w-1 -translate-y-1/2 rounded-r bg-white" />}
            <button
              onClick={() => onSelect(group.id)}
              className={`flex h-12 w-12 items-center justify-center text-xs font-bold transition ${
                active
                  ? "rounded-[12px] bg-[#5865f2] text-white"
                  : "rounded-[24px] bg-[#313338] text-[#dbdee1] hover:rounded-[12px] hover:bg-[#5865f2] hover:text-white"
              }`}
              aria-label={group.name}
            >
              {group.avatar}
            </button>
          </div>
        );
      })}
      <button className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-[#313338] text-[#23a55a] transition hover:rounded-[12px] hover:bg-[#23a55a] hover:text-white" aria-label="Server qo'shish">
        <Plus size={22} />
      </button>
    </aside>
  );
}

function ChannelSidebar({ activeGroup }: { activeGroup: Group | undefined }) {
  const channels = ["umumiy", "savdo-goyalari", "bozor-tahlili", "natijalar"];
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col bg-[#2b2d31] md:flex">
      <button className="flex h-12 items-center border-b border-black/30 px-4 text-left font-bold text-white shadow-sm">
        <span className="truncate">{activeGroup?.name}</span>
        <ChevronDown className="ml-auto" size={18} />
      </button>
      <div className="flex-1 overflow-y-auto px-2 pt-4">
        <div className="mb-1 flex items-center px-1 text-[11px] font-bold uppercase text-[#949ba4]">
          <ChevronDown size={12} /> Text kanallari
          <Plus className="ml-auto" size={16} />
        </div>
        {channels.map((channel, index) => (
          <button
            key={channel}
            className={`mb-0.5 flex w-full items-center rounded px-2 py-1.5 text-left font-medium ${
              index === 0
                ? "bg-[#404249] text-white"
                : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
            }`}
          >
            <Hash className="mr-1.5" size={20} />
            {channel}
            {index === 0 && <UserPlus className="ml-auto opacity-0 group-hover:opacity-100" size={15} />}
          </button>
        ))}
        <div className="mb-1 mt-5 flex items-center px-1 text-[11px] font-bold uppercase text-[#949ba4]">
          <ChevronDown size={12} /> Ovozli kanallar
          <Plus className="ml-auto" size={16} />
        </div>
        {["Trading room", "London session"].map((channel) => (
          <button key={channel} className="mb-0.5 flex w-full items-center rounded px-2 py-1.5 text-left font-medium text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]">
            <Volume2 className="mr-1.5" size={19} />{channel}
          </button>
        ))}
      </div>
      <div className="flex h-[53px] items-center bg-[#232428] px-2">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 text-xs font-bold">AT<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#232428] bg-[#23a55a]" /></div>
        <div className="ml-2 min-w-0 leading-tight"><p className="truncate text-xs font-bold text-white">Aziz Trader</p><p className="text-[11px] text-[#b5bac1]">Online</p></div>
        <div className="ml-auto flex text-[#b5bac1]"><button className="rounded p-1.5 hover:bg-[#3b3d44]"><Mic size={16} /></button><button className="rounded p-1.5 hover:bg-[#3b3d44]"><Headphones size={16} /></button><button className="rounded p-1.5 hover:bg-[#3b3d44]"><Settings size={16} /></button></div>
      </div>
    </aside>
  );
}

export function Chat({ onLogin }: { onLogin: () => void }) {
  const { user, configured } = useAuth();
  const [groups, setGroups] = useState<Group[]>(demoGroups);
  const [activeGroupId, setActiveGroupId] = useState(demoGroups[0].id);
  const [messages, setMessages] = useState<GroupMessage[]>(() => {
    if (typeof window === "undefined") return demoMessages;
    const stored = localStorage.getItem("tradex-messages");
    return stored ? JSON.parse(stored) as GroupMessage[] : demoMessages;
  });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? groups[0],
    [activeGroupId, groups],
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.from("groups").select("id, name, description, avatar").order("created_at").then(({ data }) => {
      if (!data?.length) return;
      const cloudGroups = data as GroupRecord[];
      setGroups(cloudGroups);
      setActiveGroupId(cloudGroups[0].id);
    });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !activeGroupId) return;

    supabase.from("group_messages").select("*").eq("group_id", activeGroupId).order("created_at").limit(100).then(({ data }) => {
      setMessages(data?.length ? (data as MessageRecord[]).map(toMessage) : []);
    });

    const channel = supabase
      .channel(`group-${activeGroupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${activeGroupId}` }, (payload) => {
        const incoming = toMessage(payload.new as MessageRecord);
        setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeGroupId]);

  const send = async () => {
    if (!text.trim()) return;
    if (configured && !user) {
      onLogin();
      return;
    }

    setSending(true);
    const name = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Aziz Trader");
    const avatar = name.split(" ").map((part) => part[0]).join("").slice(0, 2);
    const supabase = getSupabaseBrowserClient();

    if (supabase && user) {
      await supabase.from("group_messages").insert({
        group_id: activeGroupId,
        user_id: user.id,
        sender_name: name,
        sender_avatar: avatar,
        content: text.trim(),
      });
    } else {
      const created: GroupMessage = {
        id: crypto.randomUUID(),
        groupId: activeGroupId,
        name,
        avatar,
        text: text.trim(),
        createdAt: "hozir",
      };
      setMessages((current) => {
        const next = [...current, created];
        localStorage.setItem("tradex-messages", JSON.stringify(next));
        return next;
      });
    }
    setText("");
    setSending(false);
  };

  const visibleMessages = messages.filter((message) => message.groupId === activeGroupId);

  return (
    <div className="flex h-screen min-h-[650px] overflow-hidden bg-[#313338] text-[#dbdee1]">
      <ServerRail groups={groups} activeGroupId={activeGroupId} onSelect={setActiveGroupId} />
      <ChannelSidebar activeGroup={activeGroup} />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center border-b border-black/30 bg-[#313338] px-4 shadow-sm">
          <Hash className="mr-2 text-[#80848e]" size={24} />
          <h1 className="font-bold text-white">umumiy</h1>
          <span className="ml-3 hidden h-6 w-px bg-[#3f4147] sm:block" />
          <p className="ml-3 hidden truncate text-sm text-[#b5bac1] sm:block">{activeGroup?.description}</p>
          <div className="ml-auto flex items-center gap-4 text-[#b5bac1]">
            <Bell className="hidden hover:text-white sm:block" size={20} />
            <Users className="hover:text-white" size={21} />
            <label className="hidden h-6 w-36 items-center rounded bg-[#1e1f22] px-2 text-xs lg:flex">
              <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Qidirish" />
              <Search size={14} />
            </label>
            <Inbox className="hidden hover:text-white sm:block" size={20} />
            <HelpCircle className="hidden hover:text-white sm:block" size={20} />
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto pb-4">
              <div className="px-4 pb-4 pt-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#41434a]"><Hash size={38} /></div>
                <h2 className="mt-3 text-3xl font-bold text-white">#umumiy kanaliga xush kelibsiz!</h2>
                <p className="mt-2 text-sm text-[#b5bac1]">Bu {activeGroup?.name} serverining boshlanishi.</p>
              </div>
              <div className="my-3 flex items-center px-4 text-xs font-semibold text-[#949ba4]"><span className="h-px flex-1 bg-[#3f4147]" /><span className="px-2">2026-yil 7-iyun</span><span className="h-px flex-1 bg-[#3f4147]" /></div>
              {!visibleMessages.length && <div className="px-4 py-10 text-center text-sm text-[#949ba4]">Bu kanalda hali xabar yo&apos;q.</div>}
              {visibleMessages.map((message) => (
                <article key={message.id} className="group flex px-4 py-1 hover:bg-[#2e3035]">
                  <div className="mr-4 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5865f2] to-[#eb459e] text-xs font-bold text-white">{message.avatar}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2"><span className="font-semibold text-white hover:underline">{message.name}</span><span className="text-[11px] text-[#949ba4]">Bugun, {message.createdAt}</span></div>
                    <p className="break-words text-[15px] leading-[1.375rem] text-[#dbdee1]">{message.text}</p>
                  </div>
                </article>
              ))}
            </div>
            {configured && !user && (
              <button onClick={onLogin} className="mx-4 mb-2 flex items-center justify-center gap-2 rounded bg-[#2b2d31] py-2 text-sm font-semibold hover:bg-[#232428]">
                <LockKeyhole size={16} />Xabar yozish uchun Google bilan kiring
              </button>
            )}
            <div className="mx-4 mb-6 flex min-h-11 items-center rounded-lg bg-[#383a40] px-3">
              <button className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#b5bac1] text-[#383a40] hover:bg-white" aria-label="Fayl qo'shish"><Plus size={18} /></button>
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void send()}
                placeholder={`#umumiy kanaliga xabar yuborish`}
                className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-[#dbdee1] outline-none placeholder:text-[#6d6f78]"
              />
              <div className="ml-2 flex items-center gap-3 text-[#b5bac1]">
                <Gift className="hidden hover:text-white sm:block" size={20} />
                <ImagePlus className="hidden hover:text-white sm:block" size={20} />
                <Sticker className="hidden hover:text-white sm:block" size={20} />
                <Smile className="hover:text-white" size={20} />
                <Button disabled={sending || !text.trim()} onClick={() => void send()} size="icon-sm" className="h-7 w-7 rounded bg-[#5865f2] hover:bg-[#4752c4]" aria-label="Yuborish">
                  {sending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={15} />}
                </Button>
              </div>
            </div>
          </div>
          <aside className="hidden w-[240px] shrink-0 overflow-y-auto bg-[#2b2d31] px-2 py-5 xl:block">
            <p className="px-2 text-[11px] font-bold uppercase text-[#949ba4]">Online — {members.length}</p>
            <div className="mt-2 space-y-0.5">
              {members.map((member) => (
                <button key={member.name} className="flex w-full items-center rounded px-2 py-1.5 text-left hover:bg-[#35373c]">
                  <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${member.color} text-[10px] font-bold text-white`}>
                    {member.avatar}
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-[3px] border-[#2b2d31] bg-[#23a55a]" />
                  </div>
                  <div className="ml-3 min-w-0"><p className="truncate text-sm font-semibold text-[#b5bac1]">{member.name}</p><p className="truncate text-[11px] text-[#949ba4]">{member.status}</p></div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
