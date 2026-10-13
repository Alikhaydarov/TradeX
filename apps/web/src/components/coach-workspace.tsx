"use client";

import { useRef, useState } from "react";
import { ArrowUp, Bot, LoaderCircle, Plus, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
const prompts = ["Review the habits behind my largest losses", "Build a pre-session risk checklist", "How should I journal emotional trades?", "Help me compare two trading setups"];

export function CoachWorkspace() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setInput(""); setLoading(true); setError(null);
    try {
      const response = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const payload = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !payload.answer) throw new Error(payload.error || "Coach did not respond.");
      setMessages(current => [...current, { role: "assistant", content: payload.answer! }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Coach is temporarily unavailable.");
    } finally { setLoading(false); }
  }

  function selectPrompt(prompt: string) { setInput(prompt); requestAnimationFrame(() => formRef.current?.querySelector("textarea")?.focus()); }

  return <section className="coach-shell">
    <aside className="coach-rail"><button className="coach-new" onClick={()=>{setMessages([]);setError(null);}}><Plus size={16}/> New review</button><div><p className="section-label">Context</p><div className="coach-context"><b>Apex 100K</b><span>Last 30 days</span><small>Account data connection pending</small></div></div><p className="coach-privacy"><Sparkles size={13}/> Private session</p></aside>
    <div className="coach-main">
      <div className="coach-feed">
        {messages.length === 0 ? <div className="coach-empty"><span><Bot size={25}/></span><p className="section-label">Tradoxy intelligence</p><h2>What do you want to understand?</h2><p>Review execution, decision quality and risk without leaving your journal.</p><div className="coach-prompts">{prompts.map(prompt=><button key={prompt} onClick={()=>selectPrompt(prompt)}>{prompt}</button>)}</div></div> : <div className="coach-messages">{messages.map((message,index)=><article key={`${message.role}-${index}`} className={message.role === "user" ? "coach-user" : "coach-assistant"}>{message.role === "assistant" && <span><Bot size={15}/></span>}<div>{message.content}</div></article>)}{loading && <article className="coach-assistant"><span><LoaderCircle className="animate-spin" size={15}/><div>Reviewing your question...</div></span></article>}</div>}
      </div>
      <div className="coach-composer-wrap">{error && <p className="coach-error">{error}</p>}<form ref={formRef} onSubmit={send} className="coach-composer"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();formRef.current?.requestSubmit();}}} rows={1} placeholder="Ask about your process, risk or trading habits..."/><button disabled={!input.trim()||loading} aria-label="Send message"><ArrowUp size={18}/></button></form><p>AI review is educational and does not constitute financial advice.</p></div>
    </div>
  </section>;
}
