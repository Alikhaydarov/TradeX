import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) return badRequest("Trade rasmini tanlang.");
  if (!ALLOWED_TYPES.has(file.type)) return badRequest("Faqat JPG, PNG yoki WEBP yuklang.");
  if (file.size > MAX_SIZE) return badRequest("Rasm hajmi 5MB dan oshmasin.");

  const filePath = `${auth.user.id}/${crypto.randomUUID()}.${extensionFromType(file.type)}`;
  const { error } = await auth.supabase.storage
    .from("journal-images")
    .upload(filePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

  if (error) return serverError(error.message);
  const { data } = auth.supabase.storage.from("journal-images").getPublicUrl(filePath);
  return Response.json({ imageUrl: data.publicUrl });
}
