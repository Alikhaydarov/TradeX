import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;
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
  const file = formData.get("image");

  if (!(file instanceof File)) return badRequest("Rasm faylini tanlang.");
  if (!ALLOWED_TYPES.has(file.type)) return badRequest("Faqat JPG, PNG, WEBP yoki GIF rasm yuklang.");
  if (file.size > MAX_SIZE) return badRequest("Rasm hajmi 5MB dan oshmasin.");

  const extension = extensionFromType(file.type);
  const imageId = crypto.randomUUID();
  const filePath = `${auth.user.id}/${imageId}.${extension}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await auth.supabase.storage
    .from("post-images")
    .upload(filePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return serverError(uploadError.message);

  const { data: publicData } = auth.supabase.storage.from("post-images").getPublicUrl(filePath);
  return Response.json({ imageUrl: publicData.publicUrl });
}
