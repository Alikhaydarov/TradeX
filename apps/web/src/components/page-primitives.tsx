import type { LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium uppercase text-[var(--primary)]">{eyebrow}</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p></div>{action}</header>;
}

export function MetricCard({ label, value, helper, icon: Icon, tone = "default" }: { label: string; value: string; helper: string; icon: LucideIcon; tone?: "default" | "positive" | "warning" }) {
  const color = tone === "positive" ? "text-[var(--primary)]" : tone === "warning" ? "text-[var(--warning)]" : "text-[var(--foreground)]";
  return <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"><div className="flex items-center justify-between"><p className="text-xs text-[var(--muted)]">{label}</p><Icon size={16} className="text-[var(--muted)]"/></div><p className={`mt-4 font-mono text-2xl font-semibold ${color}`}>{value}</p><p className="mt-2 text-xs text-[var(--muted)]">{helper}</p></article>;
}

export function Panel({ title, description, children, className = "" }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-[var(--border)] bg-[var(--card)] ${className}`}><div className="border-b border-[var(--border)] px-5 py-4"><h2 className="font-semibold">{title}</h2>{description && <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>}</div><div className="p-5">{children}</div></section>;
}

