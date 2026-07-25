import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeAuthError(message: string, mode: "login" | "register") {
  const normalized = message.toLowerCase();
  if (normalized.includes("already registered")) return "This email is already registered.";
  if (normalized.includes("email rate limit")) return "Too many attempts. Please try again later.";
  if (normalized.includes("password")) {
    return mode === "login"
      ? "Email or password is incorrect."
      : "Password does not meet the security requirements.";
  }
  if (normalized.includes("invalid login")) return "Email or password is incorrect.";
  return mode === "login" ? "Unable to sign in right now." : "Unable to create account right now.";
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return Response.json({ error: "Backend auth is not configured yet." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    mode?: "login" | "register";
    name?: string;
    email?: string;
    password?: string;
  } | null;

  const mode = body?.mode;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const name = body?.name?.trim().replace(/\s+/g, " ") ?? "";

  if (mode !== "login" && mode !== "register") {
    return Response.json({ error: "Invalid auth request." }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return Response.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });
  }
  if (mode === "register" && (name.length < 2 || name.length > 60)) {
    return Response.json({ error: "Name must be between 2 and 60 characters." }, { status: 400 });
  }

  if (mode === "login") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return Response.json({ error: safeAuthError(error.message, mode) }, { status: 400 });
    }
    return Response.json({ ok: true });
  }

  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return Response.json({ error: safeAuthError(error.message, mode) }, { status: 400 });
  }

  return Response.json({
    ok: true,
    requiresEmailConfirmation: !data.session,
  });
}
