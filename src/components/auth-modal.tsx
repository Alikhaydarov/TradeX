"use client";

import { ArrowRight, Check, Eye, EyeOff, Github, Mail, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth, type AuthProviderName } from "./auth-context";

type AuthMode = "login" | "register";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14.1a6 6 0 0 1 0-4.2V7.3H3.2a10 10 0 0 0 0 9.4l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.3l3.3 2.6a5.8 5.8 0 0 1 5.5-4Z" />
    </svg>
  );
}

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M19.5 5.34A17.1 17.1 0 0 0 15.44 4l-.5 1.02a15.4 15.4 0 0 0-5.86 0L8.56 4A17.2 17.2 0 0 0 4.5 5.35C1.93 9.15 1.24 12.86 1.6 16.5a16.4 16.4 0 0 0 4.98 2.5l1.2-1.65a10.8 10.8 0 0 1-1.88-.9l.46-.35c3.63 1.67 7.57 1.67 11.15 0l.47.35c-.6.35-1.23.65-1.89.9L17.3 19a16.3 16.3 0 0 0 4.98-2.5c.43-4.22-.73-7.9-2.78-11.16ZM8.86 14.28c-1.09 0-1.98-1-1.98-2.22s.87-2.23 1.98-2.23c1.12 0 2 1.01 1.98 2.23 0 1.22-.87 2.22-1.98 2.22Zm6.27 0c-1.09 0-1.98-1-1.98-2.22s.87-2.23 1.98-2.23c1.12 0 2 1.01 1.98 2.23 0 1.22-.86 2.22-1.98 2.22Z" />
    </svg>
  );
}

export function AuthModal({
  open,
  onClose,
  initialMode = "login",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}) {
  const {
    configured,
    signInWithOAuth,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError(null);
    setConfirmationEmail(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [initialMode, open]);

  if (!open) return null;

  const oauth = async (provider: AuthProviderName) => {
    setError(null);
    setPending(provider);
    const nextError = await signInWithOAuth(provider);
    if (nextError) {
      setError(nextError);
      setPending(null);
    }
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending("password");
    if (mode === "login") {
      const nextError = await signInWithPassword(email, password);
      if (nextError) setError(nextError);
    } else {
      const result = await signUpWithPassword(name, email, password);
      if (result.error) setError(result.error);
      if (result.requiresEmailConfirmation) setConfirmationEmail(email);
    }
    setPending(null);
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-6" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="relative my-auto w-full max-w-[460px] overflow-hidden rounded-[28px] border border-white/12 bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,.8)]"
      >
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="p-5 sm:p-7">
          <div className="flex items-center">
            <span className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white text-xs font-black text-black">TD</span>
            <span className="ml-3 text-sm font-bold tracking-tight">Tradox</span>
            <button onClick={onClose} className="ml-auto grid size-9 place-items-center rounded-full text-zinc-500 transition hover:bg-white/8 hover:text-white" aria-label="Close">
              <X size={19} />
            </button>
          </div>

          {confirmationEmail ? (
            <div className="py-10 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full border border-white/15 bg-white text-black">
                <Check size={25} strokeWidth={2.5} />
              </span>
              <h2 id="auth-modal-title" className="mt-6 text-2xl font-bold tracking-tight">Check your inbox</h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-zinc-400">
                We sent a secure confirmation link to <strong className="text-zinc-200">{confirmationEmail}</strong>.
              </p>
              <button onClick={onClose} className="mt-7 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200">
                Back to Tradox
              </button>
            </div>
          ) : (
            <>
              <div className="mt-7 grid grid-cols-2 rounded-xl border border-white/8 bg-white/[.035] p-1">
                {(["login", "register"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setMode(item);
                      setError(null);
                    }}
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === item ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    {item === "login" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <div className="mt-7">
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-zinc-600">Your trading operating system</p>
                <h2 id="auth-modal-title" className="mt-2 text-2xl font-bold tracking-[-.035em] sm:text-[28px]">
                  {mode === "login" ? "Welcome back." : "Build your edge."}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {mode === "login" ? "Continue where your last session ended." : "Start your journal and track every decision."}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                <button onClick={() => oauth("google")} disabled={Boolean(pending)} className="grid h-12 place-items-center rounded-xl border border-white/10 bg-white/[.035] transition hover:border-white/25 hover:bg-white/[.07] disabled:opacity-50" aria-label="Continue with Google">
                  {pending === "google" ? <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <GoogleMark />}
                </button>
                <button onClick={() => oauth("github")} disabled={Boolean(pending)} className="grid h-12 place-items-center rounded-xl border border-white/10 bg-white/[.035] transition hover:border-white/25 hover:bg-white/[.07] disabled:opacity-50" aria-label="Continue with GitHub">
                  {pending === "github" ? <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <Github size={21} />}
                </button>
                <button onClick={() => oauth("discord")} disabled={Boolean(pending)} className="grid h-12 place-items-center rounded-xl border border-white/10 bg-white/[.035] transition hover:border-white/25 hover:bg-white/[.07] disabled:opacity-50" aria-label="Continue with Discord">
                  {pending === "discord" ? <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <DiscordMark />}
                </button>
              </div>

              <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.14em] text-zinc-700">
                <span className="h-px flex-1 bg-white/8" />or use email<span className="h-px flex-1 bg-white/8" />
              </div>

              <form onSubmit={submitPassword} className="space-y-3">
                {mode === "register" && (
                  <label className="block">
                    <span className="sr-only">Full name</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required minLength={2} maxLength={60} placeholder="Full name" className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-sm outline-none transition placeholder:text-zinc-700 focus:border-white/35" />
                  </label>
                )}
                <label className="relative block">
                  <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength={254} placeholder="Email address" className="h-12 w-full rounded-xl border border-white/10 bg-black pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-700 focus:border-white/35" />
                </label>
                <label className="relative block">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} placeholder="Password (8+ characters)" className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 pr-12 text-sm outline-none transition placeholder:text-zinc-700 focus:border-white/35" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-zinc-600 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </label>
                <button type="submit" disabled={Boolean(pending)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">
                  {pending === "password" ? <span className="size-4 animate-spin rounded-full border-2 border-black/20 border-t-black" /> : <ArrowRight size={17} />}
                  {mode === "login" ? "Sign in securely" : "Create free account"}
                </button>
              </form>

              {!configured && <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-400">Backend auth is not configured yet.</p>}
              {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-sm text-red-300" role="alert">{error}</p>}
              <p className="mt-5 text-center text-[11px] leading-5 text-zinc-600">
                By continuing, you agree to the Terms and Privacy Policy.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
