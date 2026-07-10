"use client";

import { Bell, BellRing, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-context";

interface ToastState {
  title: string;
  body: string;
}

interface AppNotification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  } | null;
}

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function shortText(value: string, max = 90) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function playNotificationSound() {
  try {
    const audioWindow = window as AudioWindow;
    const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.09);

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.24);

    window.setTimeout(() => void audioContext.close(), 350);
  } catch {
    // Audio is best-effort because browsers can block autoplay before user interaction.
  }
}

export function NotificationListener() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const seenMessageIds = useRef(new Set<string>());
  const initialized = useRef(false);
  const polling = useRef(false);
  const soundEnabled = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      setPermission("Notification" in window ? Notification.permission : "unsupported");
      soundEnabled.current = localStorage.getItem("tradeup-notification-sound") === "on";
      setPromptDismissed(localStorage.getItem("tradeup-notification-prompt") === "dismissed");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      seenMessageIds.current.clear();
      initialized.current = false;
      return;
    }

    let active = true;

    const notify = (item: AppNotification) => {
      const actorName = item.actor?.fullName || "TradeWay";
      const body = shortText(item.message);
      setToast({ title: actorName, body });
      window.setTimeout(() => setToast(null), 4500);

      if (soundEnabled.current) playNotificationSound();

      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        (document.hidden || !document.hasFocus())
      ) {
        const notification = new Notification(actorName, {
          body,
          tag: `tradeway-notification-${item.id}`,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    };

    const poll = async () => {
      if (polling.current) return;
      if (document.hidden) return;
      polling.current = true;

      try {
        const { notifications } = await apiRequest<{ notifications: AppNotification[] }>("/api/social/notifications");

        if (!active) return;

        for (const item of notifications) {
          const seen = seenMessageIds.current.has(item.id);
          if (!seen) {
            seenMessageIds.current.add(item.id);
            if (initialized.current && !item.isRead) notify(item);
          }
        }

        initialized.current = true;
      } catch {
        // Notification polling is best-effort and should not break the app.
      } finally {
        polling.current = false;
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 45000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user]);

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      soundEnabled.current = true;
      localStorage.setItem("tradeup-notification-sound", "on");
      playNotificationSound();
    }
  };

  const dismissPrompt = () => {
    setPromptDismissed(true);
    localStorage.setItem("tradeup-notification-prompt", "dismissed");
  };

  if (!user) return null;

  return (
    <>
      {permission === "default" && !promptDismissed && (
        <div className="fixed bottom-5 right-3 z-30 hidden max-w-[280px] rounded-2xl border border-white/10 bg-[#171717]/90 p-3 text-xs text-slate-200 shadow-2xl shadow-slate-950/40 backdrop-blur-2xl sm:block">
          <div className="flex gap-2 pr-7">
            <Bell size={16} className="mt-0.5 shrink-0 text-zinc-300" />
            <div>
              <p className="font-bold">Chat notification yoqilsinmi?</p>
              <p className="mt-1 leading-5 text-slate-400">Yangi xabar kelsa notification va ovoz chiqadi.</p>
            </div>
          </div>
          <button onClick={dismissPrompt} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-xl text-slate-500 hover:bg-white/[.06] hover:text-white" aria-label="Notification promptni yopish">
            <X size={14} />
          </button>
          <Button onClick={() => void enableNotifications()} className="mt-3 h-9 w-full rounded-xl bg-white text-xs font-bold text-slate-950 hover:bg-zinc-200">
            Yoqish
          </Button>
        </div>
      )}

      {toast && (
        <div className="fixed right-3 top-3 z-[80] w-[min(360px,calc(100vw-24px))] rounded-2xl border border-white/10 bg-[#171717]/95 p-3 text-sm text-white shadow-2xl shadow-slate-950/50 backdrop-blur-2xl">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/[.06] text-zinc-300">
              <BellRing size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black">{toast.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{toast.body}</p>
            </div>
            <button onClick={() => setToast(null)} className="grid h-7 w-7 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white/[.06] hover:text-white" aria-label="Yopish">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
