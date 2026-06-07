"use client";

import { Bell, BellRing, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-context";
import type { Group } from "./types";

interface MessageRecord {
  id: string;
  group_id: string;
  user_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

interface ToastState {
  title: string;
  body: string;
}

function shortText(value: string, max = 90) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
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
  const seenMessageIds = useRef(new Set<string>());
  const initialized = useRef(false);
  const polling = useRef(false);
  const soundEnabled = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    soundEnabled.current = localStorage.getItem("tradeup-notification-sound") === "on";
  }, []);

  useEffect(() => {
    if (!user) {
      seenMessageIds.current.clear();
      initialized.current = false;
      return;
    }

    let active = true;

    const notify = (chat: Group, message: MessageRecord) => {
      const body = shortText(message.content);
      setToast({ title: `${message.sender_name} · ${chat.name}`, body });
      window.setTimeout(() => setToast(null), 4500);

      if (soundEnabled.current) playNotificationSound();

      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        (document.hidden || !document.hasFocus())
      ) {
        const notification = new Notification(`${message.sender_name} · ${chat.name}`, {
          body,
          tag: `tradeup-chat-${chat.id}`,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    };

    const poll = async () => {
      if (polling.current) return;
      polling.current = true;

      try {
        const { chats } = await apiRequest<{ chats: Group[] }>("/api/chats");
        const results = await Promise.allSettled(
          chats.slice(0, 25).map(async (chat) => {
            const { messages } = await apiRequest<{ messages: MessageRecord[] }>(`/api/chats/${chat.id}/messages`);
            return { chat, messages };
          }),
        );

        if (!active) return;

        for (const result of results) {
          if (result.status !== "fulfilled") continue;
          const { chat, messages } = result.value;

          for (const message of messages) {
            const seen = seenMessageIds.current.has(message.id);
            if (!seen) {
              seenMessageIds.current.add(message.id);

              if (initialized.current && message.user_id !== user.id) {
                notify(chat, message);
              }
            }
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
    const timer = window.setInterval(() => void poll(), 10000);

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

  if (!user) return null;

  return (
    <>
      {permission === "default" && (
        <div className="fixed bottom-20 right-3 z-[70] max-w-[280px] rounded-2xl border border-cyan-200/15 bg-[#0b1220]/90 p-3 text-xs text-slate-200 shadow-2xl shadow-slate-950/40 backdrop-blur-2xl lg:bottom-5">
          <div className="flex gap-2">
            <Bell size={16} className="mt-0.5 shrink-0 text-cyan-200" />
            <div>
              <p className="font-bold">Chat notification yoqilsinmi?</p>
              <p className="mt-1 leading-5 text-slate-400">Yangi xabar kelsa notification va ovoz chiqadi.</p>
            </div>
          </div>
          <Button onClick={() => void enableNotifications()} className="mt-3 h-9 w-full rounded-xl bg-cyan-300 text-xs font-bold text-slate-950 hover:bg-cyan-200">
            Yoqish
          </Button>
        </div>
      )}

      {toast && (
        <div className="fixed right-3 top-3 z-[80] w-[min(360px,calc(100vw-24px))] rounded-2xl border border-white/10 bg-[#0b1220]/95 p-3 text-sm text-white shadow-2xl shadow-slate-950/50 backdrop-blur-2xl">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200">
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
