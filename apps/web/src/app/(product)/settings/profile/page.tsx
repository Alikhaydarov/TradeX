"use client";

import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { useWorkspaceUser } from "@/components/app-shell";
import Link from "next/link";

export default function ProfileSettingsPage() {
  const user = useWorkspaceUser();
  if (!user)
    return (
      <p className="text-sm text-neutral-400">
        Sign in to manage your{" "}
        <Link className="underline" href="/sign-in">
          settings
        </Link>
        .
      </p>
    );
  return (
    <section>
      <header className="mb-6">
        <h2 className="text-base font-semibold">Profile information</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Your public identity on Tradoxy.
        </p>
      </header>
      <ProfileSettingsForm
        key={user.id}
        email={user.email}
        username={user.username ?? ""}
        name={user.name}
        avatar={user.avatarUrl ?? null}
      />
    </section>
  );
}
