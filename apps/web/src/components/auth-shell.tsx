import {
  ArrowUpRight,
  LockKeyhole,
  NotebookPen,
  UsersRound,
} from "lucide-react";
import { Brand } from "./brand";
import { AuthPreviewLoader } from "./auth-preview-loader";

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
    <main className="auth2-layout">
      <section className="auth2-showcase">
        <Brand />
        <div className="auth2-showcase-main">
          <p className="auth2-eyebrow">
            <span />
            YOUR PROCESS, REFINED.
          </p>
          <h1>
            A better journal.
            <br />A sharper trader<span>.</span>
          </h1>
          <p>Turn your trading history into your next advantage.</p>
          <AuthPreviewLoader />
          <div className="auth2-features">
            <span>
              <NotebookPen size={15} />
              Journal with intention
            </span>
            <span>
              <UsersRound size={15} />
              Learn together
            </span>
            <span>
              <ArrowUpRight size={15} />
              Track what matters
            </span>
          </div>
        </div>
        <footer>
          Built for the long game.<span>TRADOXY / 02</span>
        </footer>
      </section>
      <section className="auth2-panel">
        <div className="auth2-mobile-brand">
          <Brand />
        </div>
        <div className="auth2-card">
          <div className="auth2-form-label">
            <LockKeyhole size={15} />
            Your private workspace
          </div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
          {children}
        </div>
        <footer>
          <LockKeyhole size={12} />
          Your trading data stays in your workspace.
        </footer>
      </section>
    </main>
  );
}
