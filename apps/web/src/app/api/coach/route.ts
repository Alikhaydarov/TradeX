import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const messageSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(20),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid coach message." }, { status: 400 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI Coach is not configured." }, { status: 503 });

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.35,
      max_completion_tokens: 900,
      messages: [
        { role: "system", content: "You are Tradoxy Coach, a concise trading performance coach. Focus on process, risk, journaling, and evidence. Never promise returns or provide direct financial advice. If trade data is not supplied, state the assumption and ask one precise follow-up question." },
        ...parsed.data.messages,
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    console.error("Groq request failed", response.status, await response.text());
    return NextResponse.json({ error: "Coach is temporarily unavailable." }, { status: 502 });
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) return NextResponse.json({ error: "Coach returned an empty response." }, { status: 502 });
  return NextResponse.json({ answer });
}
