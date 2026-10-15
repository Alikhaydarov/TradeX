import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  let action: unknown;
  let active: unknown;
  try {
    ({ action, active } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  if (action === "view") {
    const { data, error } = await auth.supabase.rpc("record_post_view", {
      target_post_id: id,
    });
    if (error)
      return NextResponse.json(
        { error: "View could not be recorded." },
        { status: 500 },
      );
    return NextResponse.json(
      { counted: Boolean(data) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (action !== "like" && action !== "repost")
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const table = action === "like" ? "post_likes" : "post_reposts";
  // Older clients send a toggle; new clients send the desired, repeatable state.
  if (active !== undefined && typeof active !== "boolean")
    return NextResponse.json(
      { error: "Invalid reaction state." },
      { status: 400 },
    );
  if (typeof active !== "boolean") {
    const { data: existing, error: readError } = await auth.supabase
      .from(table)
      .select("post_id")
      .eq("post_id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (readError)
      return NextResponse.json(
        { error: "Could not update this post." },
        { status: 500 },
      );
    active = !existing;
  }
  const mutation = active
    ? auth.supabase
        .from(table)
        .upsert(
          { post_id: id, user_id: auth.user.id },
          { onConflict: "post_id,user_id", ignoreDuplicates: true },
        )
    : auth.supabase
        .from(table)
        .delete()
        .eq("post_id", id)
        .eq("user_id", auth.user.id);
  const { error } = await mutation;
  if (error)
    return NextResponse.json(
      { error: "Could not update this post." },
      { status: 500 },
    );

  const { count, error: countError } = await auth.supabase
    .from(table)
    .select("post_id", { count: "exact", head: true })
    .eq("post_id", id);
  return NextResponse.json(
    { active, count: countError ? null : (count ?? 0) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
