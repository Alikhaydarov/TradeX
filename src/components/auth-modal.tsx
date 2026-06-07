"use client";

import { Database, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
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
  if (!open) return null;

  const login = async () => {
    setError(null);
    const nextError = await signInWithGoogle();
    if (nextError) setError(nextError);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#050914]/80 p-4 backdrop-blur-md">
      <section className="w-full max-w-md rounded-3xl border border-blue-400/25 bg-[#101a2d] p-6 shadow-2xl shadow-blue-950/50">
        <div className="flex items-center">
          <span className="text-2xl font-black tracking-tighter">TX</span>
          <button onClick={onClose} className="ml-auto rounded-full p-2 hover:bg-white/10" aria-label="Yopish">
            <X size={20} />
          </button>
        </div>
        <h2 className="mt-7 text-3xl font-black">TradeX&apos;ga qo&apos;shiling</h2>
        <p className="mt-2 text-sm leading-6 text-xmuted">
          Postlaringiz, profilingiz va guruh chatlaringiz barcha qurilmalarda saqlanadi.
        </p>
        <button
          onClick={login}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-white py-3 font-bold text-black transition hover:bg-[#e6e6e6]"
        >
          <GoogleMark />
          Google orqali davom etish
        </button>
        {!configured && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            Backend hozir mavjud emas. Server konfiguratsiyasini tekshiring.
          </div>
        )}
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-xmuted">
          <div className="rounded-xl border border-xborder p-3"><ShieldCheck className="mb-2 text-emerald-400" size={18} />Xavfsiz OAuth</div>
          <div className="rounded-xl border border-xborder p-3"><Database className="mb-2 text-xblue" size={18} />Node API orqali cloud</div>
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-xmuted">
          Davom etish orqali foydalanish shartlari va maxfiylik siyosatiga rozilik bildirasiz.
        </p>
      </section>
    </div>
  );
}
