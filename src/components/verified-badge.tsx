import { ShieldCheck } from "lucide-react";

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Verified trader"
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-300/12 text-cyan-200 ring-1 ring-cyan-200/20 ${className}`}
    >
      <ShieldCheck size={11} strokeWidth={2.6} />
    </span>
  );
}
