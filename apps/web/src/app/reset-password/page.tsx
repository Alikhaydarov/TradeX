import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { PasswordRecovery } from "@/components/password-recovery";

export default function ResetPasswordPage() {
  return <AuthShell title="Choose a new password" subtitle="Set a new password for your Tradoxy account."><Suspense fallback={<div className="mt-8 h-40 animate-pulse rounded-xl bg-white/[.03]"/>}><PasswordRecovery mode="update"/></Suspense></AuthShell>;
}
