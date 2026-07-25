import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

function bannerStoragePathFromUrl(value: string | null | undefined, userId: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const marker = "/storage/v1/object/public/banners/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    return path.startsWith(`${userId}/`) ? path : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("banner");

  if (!(file instanceof File)) return badRequest("Rasm faylini tanlang.");
  if (!ALLOWED_TYPES.has(file.type)) return badRequest("Faqat JPG, PNG, WEBP yoki GIF rasm yuklang.");
  if (file.size > MAX_SIZE) return badRequest("Rasm hajmi 4MB dan oshmasin.");

  const { data: previousProfile } = await auth.supabase
    .from("profiles")
    .select("banner_url")
    .eq("id", auth.user.id)
    .maybeSingle();

  const previousPath = bannerStoragePathFromUrl(previousProfile?.banner_url, auth.user.id);
  const extension = extensionFromType(file.type);
  const filePath = `${auth.user.id}/banner-${Date.now()}.${extension}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await auth.supabase.storage
    .from("banners")
    .upload(filePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return serverError(uploadError.message);

  const { data: publicData } = auth.supabase.storage.from("banners").getPublicUrl(filePath);
  const bannerUrl = `${publicData.publicUrl}?v=${Date.now()}`;

  const { data: profile, error: updateError } = await auth.supabase
    .from("profiles")
    .update({ banner_url: bannerUrl, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id)
    .select("id, username, full_name, avatar_url, banner_url, bio, trading_style, location")
    .single();

  if (updateError) return serverError(updateError.message);

  if (previousPath && previousPath !== filePath) {
    await auth.supabase.storage.from("banners").remove([previousPath]);
  }

  return Response.json({ bannerUrl, profile });
}

export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { data: previousProfile } = await auth.supabase
    .from("profiles")
    .select("banner_url")
    .eq("id", auth.user.id)
    .maybeSingle();

  const previousPath = bannerStoragePathFromUrl(previousProfile?.banner_url, auth.user.id);

  const { error: updateError } = await auth.supabase
    .from("profiles")
    .update({ banner_url: null, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id);

  if (updateError) return serverError(updateError.message);

  if (previousPath) {
    await auth.supabase.storage.from("banners").remove([previousPath]);
  }

  return Response.json({ success: true });
}
