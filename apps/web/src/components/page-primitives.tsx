import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="sr-only">{eyebrow}</p>
        <h1 className="text-base font-semibold sm:text-lg">{title}</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted)]">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  helper: React.ReactNode;
  icon: LucideIcon;
  tone?: "default" | "positive" | "warning";
}) {
  const color =
    tone === "positive"
      ? "text-[var(--profit)]"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : "text-[var(--foreground)]";
  return (
    <article className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <Icon size={15} className="shrink-0 text-[var(--muted)]" />
      </div>
      <p className={`mt-3 text-2xl font-medium tabular-nums ${color}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-[var(--muted)]">{helper}</p>
    </article>
  );
}

export function Panel({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] ${className}`}
    >
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
