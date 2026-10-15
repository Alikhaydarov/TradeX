"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecovery({ mode }: { mode: "request" | "update" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(false);
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      if (mode === "request") {
        const email = String(form.get("email") ?? "").trim();
        const redirectTo = new URL("/auth/callback", window.location.origin);
        redirectTo.searchParams.set("next", "/reset-password");
        const { error: requestError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo.toString() });
        if (requestError) throw requestError;
        setMessage("If this email has an account, a password reset link is on its way.");
      } else {
        const password = String(form.get("password") ?? "");
        const confirmation = String(form.get("confirmation") ?? "");
        if (password.length < 8 || password.length > 72) throw new Error("Password must be between 8 and 72 characters.");
        if (password !== confirmation) throw new Error("Passwords do not match.");
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setMessage("Your password has been updated. You can sign in now.");
        window.setTimeout(() => router.replace("/sign-in"), 900);
      }
    } catch (cause) {
      setError(true);
      const raw = cause instanceof Error ? cause.message.toLowerCase() : "";
      setMessage(raw.includes("passwords do not match") ? "Passwords do not match." : raw.includes("between 8") ? "Password must be between 8 and 72 characters." : "We could not complete that request. Check the details and try again.");
    } finally {
      setLoading(false);
    }
  }

  const sent = mode === "request" && Boolean(message) && !error;
  const failedLink = mode === "update" && params.get("error") === "callback";

  return <div className="auth-card">
    <span className="auth-icon">{sent ? <CheckCircle2 size={19}/> : <ArrowLeft size={19}/>}</span>
    <h2>{mode === "request" ? "Reset your password" : "Choose a new password"}</h2>
    <p>{mode === "request" ? "We’ll email you a secure link to reset your password." : "Use at least 8 characters for your new password."}</p>
    {failedLink ? <p role="alert" className="auth-message auth-message-error">This reset link is invalid or has expired. Request a new one.</p> : null}
    {message ? <p role={error ? "alert" : "status"} className={`auth-message ${error ? "auth-message-error" : ""}`}>{message}</p> : null}
    {!sent && !failedLink ? <form onSubmit={submit} className="mt-7 space-y-4">
      {mode === "request" ? <label className="auth-field"><span>Email address</span><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="name@example.com"/></label> : <>
        <label className="auth-field"><span>New password</span><input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72}/></label>
        <label className="auth-field"><span>Confirm password</span><input name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={72}/></label>
      </>}
      <button className="auth-submit" disabled={loading} type="submit">{loading ? <LoaderCircle className="animate-spin" size={17}/> : null}{mode === "request" ? "Send reset link" : "Update password"}</button>
    </form> : null}
    <p className="pt-5 text-center text-sm text-[var(--muted)]"><Link className="font-medium text-white" href="/sign-in">Back to sign in</Link></p>
  </div>;
}
