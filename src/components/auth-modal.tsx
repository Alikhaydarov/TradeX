"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14.1a6 6 0 0 1 0-4.2V7.3H3.2a10 10 0 0 0 0 9.4l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.3l3.3 2.6a5.8 5.8 0 0 1 5.5-4Z" />
    </svg>
  );
}

export function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { configured, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  const login = async () => {
    setError(null);
    setPending(true);
    const nextError = await signInWithGoogle();
    if (nextError) {
      setError(nextError);
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/92 p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/15 bg-black p-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-center">
          <span className="text-2xl font-black tracking-tighter">TD</span>
          <button onClick={onClose} className="ml-auto rounded-full p-2 hover:bg-[#111111]" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <h2 id="auth-modal-title" className="mt-7 text-3xl font-black">Join Tradox</h2>
        <p className="mt-2 text-sm leading-6 text-xmuted">
          Your profile, posts and trading workspace stay synced across devices.
        </p>
        <button
          onClick={login}
          disabled={pending}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-white py-3 font-bold text-black transition hover:bg-[#e6e6e6] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <span className="inline-flex size-5 animate-spin rounded-full border-2 border-black/20 border-t-black" aria-hidden="true" />
          ) : (
            <GoogleMark />
          )}
          {pending ? "Redirecting..." : "Continue with Google"}
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-xmuted">
          Google is currently the only sign-in method.
        </p>
        {!configured && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            Backend is not configured yet. Check the server environment and auth settings.
          </div>
        )}
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        <p className="mt-5 text-center text-xs leading-5 text-xmuted">
          By continuing, you agree to the platform terms and privacy policy.
        </p>
      </section>
    </div>
  );
}
