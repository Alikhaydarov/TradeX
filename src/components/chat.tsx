"use client";

import { Info, LoaderCircle, LockKeyhole, Plus, Search, Send, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "./auth-context";
import type { Group, GroupMessage } from "./types";

const demoGroups: Group[] = [
  { id: "crypto", name: "Crypto Uzbekistan", description: "Kripto bozor tahlili va savdo g'oyalari", avatar: "BTC" },
  { id: "forex", name: "Forex Masters", description: "Forex traderlar uchun muhokama", avatar: "FX" },
  { id: "price", name: "Price Action", description: "Toza grafik va setup'lar", avatar: "PA" },
  { id: "algo", name: "Algo Traders", description: "Algoritmik trading va backtesting", avatar: "AI" },
];

const demoMessages: GroupMessage[] = [
  { id: "m1", groupId: "crypto", name: "Sardor", avatar: "S", text: "BTC 104k ustida yopilsa long setup qidiraman.", createdAt: "14:24" },
  { id: "m2", groupId: "crypto", name: "Malika", avatar: "M", text: "Volume ham yaxshi ko'rinyapti, lekin retest kutgan ma'qul.", createdAt: "14:27" },
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
    createdAt: new Date(record.created_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
  };
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
  const activeGroup = useMemo(() => groups.find((group) => group.id === activeGroupId) ?? groups[0], [activeGroupId, groups]);

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

    supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", activeGroupId)
      .order("created_at")
      .limit(100)
      .then(({ data }) => {
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
    <div className="flex min-h-[calc(100vh-1px)]">
      <aside className="hidden w-[260px] shrink-0 border-r border-xborder sm:block">
        <div className="p-4">
          <div className="flex items-center"><h1 className="text-xl font-extrabold">Guruhlar</h1><button className="ml-auto rounded-full p-2 hover:bg-white/10" aria-label="Guruh yaratish"><Plus size={18} /></button></div>
          <label className="mt-4 flex items-center gap-2 rounded-full border border-xborder px-3 py-2 text-xmuted"><Search size={17} /><input className="w-full bg-transparent text-sm outline-none" placeholder="Guruhlarni izlash" /></label>
        </div>
        {groups.map((group) => (
          <button key={group.id} onClick={() => setActiveGroupId(group.id)} className={`flex w-full gap-3 px-3 py-3 text-left hover:bg-white/[.04] ${group.id === activeGroupId ? "border-r-2 border-xblue bg-white/[.04]" : ""}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#202327] text-[10px] font-bold">{group.avatar}</div>
            <div className="min-w-0 flex-1"><span className="truncate text-sm font-bold">{group.name}</span><p className="truncate text-xs text-xmuted">{group.description}</p></div>
          </button>
        ))}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center border-b border-xborder bg-black/90 px-4 backdrop-blur">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#202327] text-[10px] font-bold">{activeGroup?.avatar}</div>
          <div className="ml-3 min-w-0"><h2 className="truncate font-bold">{activeGroup?.name}</h2><p className="flex items-center gap-1 text-xs text-xmuted"><Users size={12} /> Community group</p></div>
          <div className="ml-auto flex gap-4 text-xblue"><Info size={21} /></div>
        </header>
        <div className="flex-1 space-y-4 p-4">
          <p className="text-center text-xs text-xmuted">Bugun</p>
          {!visibleMessages.length && <div className="py-20 text-center text-sm text-xmuted">Bu guruhda hali xabar yo&apos;q. Birinchi bo&apos;lib yozing.</div>}
          {visibleMessages.map((message) => {
            const mine = user ? message.userId === user.id : message.name === "Aziz Trader";
            return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${mine ? "rounded-br-sm bg-xblue text-white" : "rounded-bl-sm bg-[#202327]"}`}>{!mine && <p className="mb-1 text-xs font-bold text-sky-400">{message.name}</p>}<p className="text-sm leading-5">{message.text}</p><p className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-xmuted"}`}>{message.createdAt}</p></div></div>;
          })}
        </div>
        {configured && !user && <button onClick={onLogin} className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-xl border border-xborder py-2.5 text-sm font-bold hover:bg-white/5"><LockKeyhole size={16} />Xabar yozish uchun Google bilan kiring</button>}
        <div className="sticky bottom-16 flex gap-2 border-t border-xborder bg-black p-3 lg:bottom-0"><input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void send()} placeholder="Xabar yozing..." className="min-w-0 flex-1 rounded-full bg-[#202327] px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-xblue" /><button disabled={sending} onClick={() => void send()} className="flex h-10 w-10 items-center justify-center rounded-full bg-xblue disabled:opacity-50" aria-label="Yuborish">{sending ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}</button></div>
      </section>
    </div>
  );
}
