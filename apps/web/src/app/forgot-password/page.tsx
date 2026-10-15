import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { PasswordRecovery } from "@/components/password-recovery";

export default function ForgotPasswordPage() {
  return <AuthShell title="Reset your password" subtitle="Get back into your trading workspace."><Suspense fallback={<div className="mt-8 h-40 animate-pulse rounded-xl bg-white/[.03]"/>}><PasswordRecovery mode="request"/></Suspense></AuthShell>;
}
