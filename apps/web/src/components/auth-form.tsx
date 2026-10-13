"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const isSignUp = mode === "sign-up";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsError(false);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const supabase = createClient();
    const result = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setIsError(true);
      setMessage(result.error.message);
      setLoading(false);
      return;
    }
    if (isSignUp && !result.data.session) {
      setMessage("Confirmation link sent. Check your inbox to finish registration.");
      setLoading(false);
      return;
    }
    router.replace(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return <form onSubmit={submit} className="mt-8 space-y-4">
    {isSignUp && <label className="auth-field"><span>Full name</span><input name="name" autoComplete="name" placeholder="Your name" required minLength={2}/></label>}
    <label className="auth-field"><span>Email address</span><input name="email" type="email" autoComplete="email" placeholder="trader@example.com" required/></label>
    <label className="auth-field"><span className="flex items-center justify-between">Password{!isSignUp && <Link href="/forgot-password">Forgot password?</Link>}</span><input name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} placeholder={isSignUp ? "At least 8 characters" : "Enter your password"} required minLength={8}/></label>
    {message && <p role="status" className={`auth-message ${isError ? "auth-message-error" : ""}`}>{message}</p>}
    <button disabled={loading} className="auth-submit" type="submit">{loading ? <LoaderCircle className="animate-spin" size={17}/> : <ArrowRight size={17}/>} {loading ? "Please wait" : isSignUp ? "Create workspace" : "Sign in"}</button>
    <p className="pt-3 text-center text-sm text-[var(--muted)]">{isSignUp ? "Already have an account?" : "New to Tradoxy?"} <Link className="font-medium text-white" href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create an account"}</Link></p>
  </form>;
}
