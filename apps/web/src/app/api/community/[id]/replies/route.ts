import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await auth.supabase
    .from("post_replies")
    .select("id,post_id,user_id,content,created_at")
    .eq("post_id", id)
    .order("created_at")
    .limit(60);
  if (error)
    return NextResponse.json(
      { error: "Replies could not be loaded." },
      { status: 500 },
    );
  const authors = [...new Set((data ?? []).map((reply) => reply.user_id))];
  const { data: profiles } = authors.length
    ? await auth.supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,is_verified")
        .in("id", authors)
    : { data: [] };
  const byId = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  return NextResponse.json(
    {
      replies: (data ?? []).map((reply) => ({
        ...reply,
        author: byId.get(reply.user_id) ?? null,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  let content: unknown;
  try {
    content = (await request.json()).content;
  } catch {
    return NextResponse.json({ error: "Invalid reply." }, { status: 400 });
  }
  if (
    typeof content !== "string" ||
    !content.trim() ||
    content.trim().length > 280
  )
    return NextResponse.json(
      { error: "Reply must be between 1 and 280 characters." },
      { status: 400 },
    );
  const { data, error } = await auth.supabase
    .from("post_replies")
    .insert({ post_id: id, user_id: auth.user.id, content: content.trim() })
    .select("id,post_id,user_id,content,created_at")
    .single();
  if (error || !data)
    return NextResponse.json(
      { error: "Your reply could not be sent." },
      { status: 500 },
    );
  const { data: author } = await auth.supabase
    .from("profiles")
    .select("username,full_name,avatar_url")
    .eq("id", auth.user.id)
    .maybeSingle();
  return NextResponse.json(
    { reply: { ...data, author } },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
}
