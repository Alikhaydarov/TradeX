import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const { data: trade } = await auth.supabase.from("journal_entries").select("id,image_url")
    .eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!trade) return NextResponse.json({ error: "Trade was not found." }, { status: 404 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0)
    return NextResponse.json({ error: "Choose a JPG, PNG or WebP image smaller than 5 MB." }, { status: 400 });
  let images: string[] = [];
  if (trade.image_url) {
    try { const parsed: unknown = JSON.parse(trade.image_url); images = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [trade.image_url]; }
    catch { images = [trade.image_url]; }
  }
  if (images.length >= 3) return NextResponse.json({ error: "A trade can have up to three screenshots." }, { status: 400 });
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${auth.user.id}/${id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await auth.supabase.storage.from("journal-images").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "Screenshot upload failed." }, { status: 500 });
  const url = auth.supabase.storage.from("journal-images").getPublicUrl(path).data.publicUrl;
  images.push(url);
  const { error } = await auth.supabase.from("journal_entries").update({ image_url: JSON.stringify(images) })
    .eq("id", id).eq("user_id", auth.user.id);
  if (error) {
    await auth.supabase.storage.from("journal-images").remove([path]);
    return NextResponse.json({ error: "Screenshot could not be attached." }, { status: 500 });
  }
  return NextResponse.json({ images });
}
