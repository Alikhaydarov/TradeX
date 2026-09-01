import { rejectCrossSiteMutation } from "@/lib/backend/request-security";
import { clientAddress, consumeSharedLimit } from "@/lib/backend/shared-rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Two keys, because they stop different attacks. The address budget stops one
// machine working through a password list; the email budget stops a botnet
// spreading attempts on a single account across many addresses. Registration is
// held to a much tighter budget than sign-in - nobody legitimately creates
// accounts in bulk, and it is the endpoint that reveals whether an email is
// already taken.
const LOGIN_PER_ADDRESS = { limit: 12, windowSeconds: 600 };
const LOGIN_PER_EMAIL = { limit: 8, windowSeconds: 600 };
const REGISTER_PER_ADDRESS = { limit: 4, windowSeconds: 3600 };

function tooManyAttempts(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many attempts. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeAuthError(message: string, mode: "login" | "register") {
  const normalized = message.toLowerCase();
  // This does tell a caller whether an address has an account. Keeping the
  // useful message is a deliberate trade: the alternative ("check your email")
  // sends people who already have an account into a dead end. The register
  // budget above is what makes enumerating a list impractical.
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
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;

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

  // Counted after validation so that malformed requests cannot burn a real
  // user's budget, and before the Supabase call so a refused attempt costs
  // nothing upstream.
  const address = clientAddress(request);
  if (mode === "login") {
    const [addressOk, emailOk] = await Promise.all([
      consumeSharedLimit(
        `auth:login:ip:${address}`,
        LOGIN_PER_ADDRESS.limit,
        LOGIN_PER_ADDRESS.windowSeconds,
      ),
      consumeSharedLimit(
        `auth:login:email:${email}`,
        LOGIN_PER_EMAIL.limit,
        LOGIN_PER_EMAIL.windowSeconds,
      ),
    ]);
    if (!addressOk || !emailOk) {
      return tooManyAttempts(LOGIN_PER_ADDRESS.windowSeconds);
    }
  } else {
    const allowed = await consumeSharedLimit(
      `auth:register:ip:${address}`,
      REGISTER_PER_ADDRESS.limit,
      REGISTER_PER_ADDRESS.windowSeconds,
    );
    if (!allowed) return tooManyAttempts(REGISTER_PER_ADDRESS.windowSeconds);
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
