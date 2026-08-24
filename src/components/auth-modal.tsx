"use client";

import { ArrowRight, Check, Eye, EyeOff, Mail, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth, type AuthProviderName } from "./auth-context";
import { TradoxyMark } from "./tradoxy-mark";

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

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.54c.02-2.04 1.67-3.03 1.75-3.08a3.76 3.76 0 0 0-2.96-1.6c-1.24-.13-2.45.75-3.08.75-.64 0-1.61-.74-2.66-.72a3.92 3.92 0 0 0-3.3 2.01c-1.43 2.47-.37 6.1 1 8.1.68.97 1.47 2.04 2.52 2 1.02-.04 1.4-.64 2.63-.64 1.22 0 1.58.64 2.64.62 1.1-.02 1.79-.97 2.44-1.95a8 8 0 0 0 1.12-2.28 3.52 3.52 0 0 1-2.1-3.21ZM15.03 6.55a3.56 3.56 0 0 0 .82-2.55 3.63 3.63 0 0 0-2.36 1.21 3.4 3.4 0 0 0-.84 2.46 3 3 0 0 0 2.38-1.12Z" />
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
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError(null);
    setConfirmationEmail(null);
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [initialMode, open]);

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
    <AnimatePresence>
      {open && (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/92 p-3 backdrop-blur-md sm:p-6"
        onMouseDown={onClose}
      >
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.975 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.985 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="relative my-auto w-full max-w-[460px] overflow-hidden rounded-[24px] border border-white/12 bg-[#090909] shadow-[0_30px_100px_rgba(0,0,0,.8)]"
      >
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="p-5 sm:p-7">
          <div className="flex items-center">
            <span className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white text-black">
              <TradoxyMark className="size-4" />
            </span>
            <span className="ml-3 text-sm font-bold tracking-tight">Tradoxy</span>
            <button onClick={onClose} className="ml-auto grid size-9 place-items-center rounded-full text-ink-mute transition hover:bg-white/8 hover:text-white" aria-label="Close">
              <X size={19} />
            </button>
          </div>

          {confirmationEmail ? (
            <div className="py-10 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full border border-white/15 bg-white text-black">
                <Check size={25} strokeWidth={2.5} />
              </span>
              <h2 id="auth-modal-title" className="mt-6 text-2xl font-bold tracking-tight">Check your inbox</h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-ink-soft">
                We sent a secure confirmation link to <strong className="text-zinc-200">{confirmationEmail}</strong>.
              </p>
              <button onClick={onClose} className="mt-7 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200">
                Back to Tradoxy
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
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === item ? "bg-white text-black shadow-sm" : "text-ink-mute hover:text-zinc-200"}`}
                  >
                    {item === "login" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <div className="mt-7">
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-ink-subtle">Your trading operating system</p>
                <h2 id="auth-modal-title" className="mt-2 text-2xl font-bold tracking-[-.035em] sm:text-[28px]">
                  {mode === "login" ? "Welcome back." : "Build your edge."}
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-mute">
                  {mode === "login" ? "Continue where your last session ended." : "Start your journal and track every decision."}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button onClick={() => oauth("google")} disabled={Boolean(pending)} className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[.035] text-sm font-semibold transition hover:border-white/25 hover:bg-white/[.07] disabled:opacity-50" aria-label="Continue with Google">
                  {pending === "google" ? <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <GoogleMark />}
                  Google
                </button>
                <button onClick={() => oauth("apple")} disabled={Boolean(pending)} className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[.035] text-sm font-semibold transition hover:border-white/25 hover:bg-white/[.07] disabled:opacity-50" aria-label="Continue with Apple">
                  {pending === "apple" ? <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <AppleMark />}
                  Apple
                </button>
              </div>

              <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.14em] text-ink-faint">
                <span className="h-px flex-1 bg-white/8" />or use email<span className="h-px flex-1 bg-white/8" />
              </div>

              <form onSubmit={submitPassword} className="space-y-3">
                {mode === "register" && (
                  <label className="block">
                    <span className="sr-only">Full name</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required minLength={2} maxLength={60} placeholder="Full name" className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-sm outline-none transition placeholder:text-ink-faint focus:border-white/35" />
                  </label>
                )}
                <label className="relative block">
                  <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength={254} placeholder="Email address" className="h-12 w-full rounded-xl border border-white/10 bg-black pl-11 pr-4 text-sm outline-none transition placeholder:text-ink-faint focus:border-white/35" />
                </label>
                <label className="relative block">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} placeholder="Password (8+ characters)" className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 pr-12 text-sm outline-none transition placeholder:text-ink-faint focus:border-white/35" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-ink-subtle hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </label>
                <button type="submit" disabled={Boolean(pending)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">
                  {pending === "password" ? <span className="size-4 animate-spin rounded-full border-2 border-black/20 border-t-black" /> : <ArrowRight size={17} />}
                  {mode === "login" ? "Sign in securely" : "Create free account"}
                </button>
              </form>

              {!configured && <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-ink-soft">Backend auth is not configured yet.</p>}
              {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-sm text-red-300" role="alert">{error}</p>}
              <p className="mt-5 text-center text-[11px] leading-5 text-ink-subtle">
                By continuing, you agree to the Terms and Privacy Policy.
              </p>
            </>
          )}
        </div>
      </motion.section>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
