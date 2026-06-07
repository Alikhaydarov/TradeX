import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("avatar");

  if (!(file instanceof File)) return badRequest("Rasm faylini tanlang.");
  if (!ALLOWED_TYPES.has(file.type)) return badRequest("Faqat JPG, PNG, WEBP yoki GIF rasm yuklang.");
  if (file.size > MAX_SIZE) return badRequest("Rasm hajmi 2MB dan oshmasin.");

  const extension = extensionFromType(file.type);
  const filePath = `${auth.user.id}/avatar.${extension}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await auth.supabase.storage
    .from("avatars")
    .upload(filePath, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) return serverError(uploadError.message);

  const { data: publicData } = auth.supabase.storage.from("avatars").getPublicUrl(filePath);
  const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;

  const { data: profile, error: updateError } = await auth.supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id)
    .select("id, username, full_name, avatar_url, bio, trading_style, location")
    .single();

  if (updateError) return serverError(updateError.message);

  return Response.json({ avatarUrl, profile });
}
