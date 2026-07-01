"use client";

import { useState } from "react";
import { JournalAiCoachWorkspace as ExtraPanel } from "./journal-ai-coach-workspace";
import { JournalV2 } from "./journal-v2";

export function Journal({ onLogin }: { onLogin: () => void }) {
  const [tab, setTab] = useState<"a" | "b">("a");
  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-30 border-b border-white/8 bg-[rgba(8,8,8,.78)] px-3 py-2 backdrop-blur-2xl sm:px-4 lg:px-6">
        <div className="inline-flex rounded-2xl border border-white/10 bg-white/[.035] p-1">
          <button onClick={() => setTab("a")} className={`h-9 rounded-xl px-4 text-xs font-black ${tab === "a" ? "bg-white/[.10] text-white" : "text-zinc-500"}`}>Journal</button>
          <button onClick={() => setTab("b")} className={`h-9 rounded-xl px-4 text-xs font-black ${tab === "b" ? "bg-white/[.10] text-white" : "text-zinc-500"}`}>Coach</button>
        </div>
      </div>
      {tab === "a" ? <JournalV2 onLogin={onLogin} /> : <div className="mx-auto max-w-[1700px] p-3 sm:p-4 lg:p-6"><ExtraPanel /></div>}
    </div>
  );
}
