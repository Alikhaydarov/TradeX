import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Brand } from "./brand";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="original-auth">
      <Link href="/" className="original-auth-back">
        <ArrowLeft size={16} />
        Back to Tradoxy
      </Link>
      <section className="original-auth-panel">
        <Link href="/" className="original-auth-brand">
          <Brand />
        </Link>
        <div className="auth2-card">
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
        </div>
        <footer className="original-auth-footer">
          <LockKeyhole size={12} />
          Your trading data stays in your workspace.
        </footer>
      </section>
    </main>
  );
}
