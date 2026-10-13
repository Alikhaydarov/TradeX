import type { LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium uppercase text-[#35D6AD]">{eyebrow}</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#91A0B5]">{description}</p></div>{action}</header>;
}

export function MetricCard({ label, value, helper, icon: Icon, tone = "default" }: { label: string; value: string; helper: string; icon: LucideIcon; tone?: "default" | "positive" | "warning" }) {
  const color = tone === "positive" ? "text-[#35D6AD]" : tone === "warning" ? "text-[#F2B65B]" : "text-white";
  return <article className="rounded-lg border border-[#27364A] bg-[#101827] p-4"><div className="flex items-center justify-between"><p className="text-xs text-[#91A0B5]">{label}</p><Icon size={16} className="text-[#91A0B5]"/></div><p className={`mt-4 font-mono text-2xl font-semibold ${color}`}>{value}</p><p className="mt-2 text-xs text-[#91A0B5]">{helper}</p></article>;
}

export function Panel({ title, description, children, className = "" }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-[#27364A] bg-[#101827] ${className}`}><div className="border-b border-[#27364A] px-5 py-4"><h2 className="font-semibold">{title}</h2>{description && <p className="mt-1 text-xs text-[#91A0B5]">{description}</p>}</div><div className="p-5">{children}</div></section>;
}

