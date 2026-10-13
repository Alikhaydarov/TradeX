import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function SignUpPage() { return <AuthShell title="Build your edge" subtitle="Create a private workspace for your trading data."><Suspense fallback={<div className="mt-8 h-72 animate-pulse rounded-xl bg-white/[.03]"/>}><AuthForm mode="sign-up"/></Suspense></AuthShell>; }
