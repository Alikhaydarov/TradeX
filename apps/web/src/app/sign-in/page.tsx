import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function SignInPage() { return <AuthShell title="Welcome back" subtitle="Continue where your last review ended."><Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-xl bg-white/[.03]"/>}><AuthForm mode="sign-in"/></Suspense></AuthShell>; }
