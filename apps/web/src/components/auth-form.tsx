"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function friendlyAuthError(message: string) {
  const value = message.toLowerCase();
  if (value.includes("invalid login credentials")) return "Email yoki parol noto‘g‘ri.";
  if (value.includes("email not confirmed")) return "Email manzilingizni tasdiqlang, keyin qayta kiring.";
  if (value.includes("user already registered")) return "Bu email bilan hisob mavjud. Kirish sahifasidan foydalaning.";
  if (value.includes("password should be at least")) return "Parol kamida 8 ta belgidan iborat bo‘lishi kerak.";
  if (value.includes("rate limit")) return "Juda ko‘p urinish bo‘ldi. Biroz kutib qayta urinib ko‘ring.";
  if (value.includes("network") || value.includes("fetch")) return "Ulanish uzildi. Internetni tekshirib, qayta urinib ko‘ring.";
  return "So‘rovni bajarib bo‘lmadi. Ma’lumotlarni tekshirib, qayta urinib ko‘ring.";
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/dashboard";
  return value;
}

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [providerLoading, setProviderLoading] = useState(false);
  const isSignUp = mode === "sign-up";

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;
    setIsError(true);
    setMessage(error === "configuration"
      ? "Sign-in is temporarily unavailable. Please try again shortly."
      : error === "provider"
        ? "Google sign-in did not complete. Check your Google account and try again."
        : "We could not verify this sign-in link. Request a fresh link and try again.");
  }, [searchParams]);

  async function signInWithGoogle() {
    setProviderLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      const supabase = createClient();
      const next = safeNextPath(searchParams.get("next"));
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", next);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
      });
      if (error) throw error;
      if (data.url) window.location.assign(data.url);
      else throw new Error("OAuth redirect missing");
    } catch (error) {
      setIsError(true);
      setMessage(friendlyAuthError(error instanceof Error ? error.message : ""));
      setProviderLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsError(false);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setIsError(true);
      setMessage("To‘g‘ri email manzilini kiriting.");
      setLoading(false);
      return;
    }
    if (isSignUp && password !== String(form.get("confirmPassword") ?? "")) {
      setIsError(true);
      setMessage("Parollar bir-biriga mos kelmadi.");
      setLoading(false);
      return;
    }

    let result;
    try {
      const supabase = createClient();
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", safeNextPath(searchParams.get("next")));
      result = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name }, emailRedirectTo: callback.toString() },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    } catch {
      setIsError(true);
      setMessage("Kirish xizmati vaqtincha ishlamayapti. Birozdan keyin qayta urinib ko‘ring.");
      setLoading(false);
      return;
    }

    if (result.error) {
      setIsError(true);
      setMessage(friendlyAuthError(result.error.message));
      setLoading(false);
      return;
    }
    if (isSignUp && !result.data.session) {
      setMessage("Confirmation link sent. Check your inbox to finish registration.");
      setLoading(false);
      return;
    }
    router.replace(safeNextPath(searchParams.get("next")));
    router.refresh();
  }

  return <form onSubmit={submit} className="mt-7 space-y-4">
    <button type="button" onClick={() => void signInWithGoogle()} disabled={providerLoading || loading} className="auth-google">
      {providerLoading ? <LoaderCircle className="animate-spin" size={17}/> : <GoogleMark/>}
      Continue with Google
    </button>
    <div className="auth-divider"><span>or continue with email</span></div>
    {isSignUp && <label className="auth-field"><span>Full name</span><input name="name" autoComplete="name" placeholder="Your name" required minLength={2} maxLength={80}/></label>}
    <label className="auth-field"><span>Email address</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" required maxLength={254}/></label>
    <label className="auth-field"><span className="flex items-center justify-between">Password{!isSignUp && <Link href="/forgot-password">Forgot password?</Link>}</span><span className="auth-password"><input name="password" type={showPassword ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} placeholder={isSignUp ? "At least 8 characters" : "Your password"} required minLength={8} maxLength={72}/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
    {isSignUp && <label className="auth-field"><span>Confirm password</span><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repeat your password" required minLength={8} maxLength={72}/></label>}
    {message && <p role={isError ? "alert" : "status"} className={`auth-message ${isError ? "auth-message-error" : ""}`}>{message}</p>}
    <button disabled={loading || providerLoading} className="auth-submit" type="submit">{loading ? <LoaderCircle className="animate-spin" size={17}/> : <ArrowRight size={17}/>} {loading ? "Please wait" : isSignUp ? "Create account" : "Sign in"}</button>
    {isSignUp && <p className="text-center text-[11px] leading-5 text-[var(--muted)]">By continuing, you agree to our Terms and Privacy Policy.</p>}
    <p className="pt-2 text-center text-sm text-[var(--muted)]">{isSignUp ? "Already have an account?" : "New to Tradoxy?"} <Link className="font-medium text-white" href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create an account"}</Link></p>
  </form>;
}

function GoogleMark() {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14.1a6 6 0 0 1 0-4.2V7.3H3.2a10 10 0 0 0 0 9.4l3.3-2.6Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.3l3.3 2.6a5.8 5.8 0 0 1 5.5-4Z"/></svg>;
}
