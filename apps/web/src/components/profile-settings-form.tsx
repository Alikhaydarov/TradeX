"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, Save, UserRound } from "lucide-react";

export function ProfileSettingsForm({
  email,
  username,
  name,
  avatar,
}: {
  email: string;
  username: string;
  name: string;
  avatar: string | null;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const [value, setValue] = useState(username);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const normalized = value.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
      setError(
        "Username must be 3–24 characters: lowercase letters, numbers or underscore.",
      );
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalized }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "Profile could not be updated.");
      setValue(result.username);
      void client.invalidateQueries({ queryKey: ["social"] });
      void client.invalidateQueries({ queryKey: ["search"] });
      router.refresh();
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Profile could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-5">
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--elevated)] text-[var(--primary)]">
          {avatar?.startsWith("http") ? (
            <Image src={avatar} alt="" width={56} height={56} unoptimized />
          ) : (
            <UserRound size={23} />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Trader profile</p>
        </div>
      </div>
      <label className="block">
        <span className="mb-2 block text-xs text-[var(--muted)]">Username</span>
        <div className="flex h-10 items-center rounded-md border border-[var(--border)] bg-[#0b0d0f] px-3 focus-within:border-[var(--primary)]">
          <span className="text-sm text-[var(--muted)]">@</span>
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSaved(false);
            }}
            minLength={3}
            maxLength={24}
            autoComplete="username"
            className="h-full min-w-0 flex-1 bg-transparent pl-1 text-sm outline-none"
            aria-describedby="profile-username-hint"
          />
        </div>
        <small
          id="profile-username-hint"
          className="mt-1.5 block text-[11px] text-[var(--muted)]"
        >
          3–24 characters · lowercase letters, numbers and _
        </small>
      </label>
      <label className="block">
        <span className="mb-2 block text-xs text-[var(--muted)]">Email</span>
        <input
          value={email}
          readOnly
          className="h-10 w-full cursor-not-allowed rounded-md border border-[var(--border)] bg-[#0b0d0f] px-3 text-sm text-[var(--muted)]"
        />
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-[#54373a] bg-[#1a1011] px-3 py-2 text-xs text-[#ff9ea7]"
        >
          {error}
        </p>
      )}
      {saved && (
        <p
          role="status"
          className="flex items-center gap-2 text-xs text-[var(--primary)]"
        >
          <Check size={14} /> Profile updated
        </p>
      )}
      <button
        type="submit"
        disabled={
          saving || value.trim().toLowerCase().replace(/^@/, "") === username
        }
        className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-[#07100d] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {saving ? (
          <LoaderCircle size={15} className="animate-spin" />
        ) : (
          <Save size={15} />
        )}{" "}
        Save username
      </button>
    </form>
  );
}
