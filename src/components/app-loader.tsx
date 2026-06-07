export function XSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-9 w-9" : "h-6 w-6";

  return (
    <span
      className={`${sizeClass} inline-block animate-spin rounded-full border-2 border-white/15 border-t-cyan-200 shadow-[0_0_18px_rgba(34,211,238,.25)]`}
      aria-label="Loading"
    />
  );
}

export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Loading">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-200 [animation-delay:-.24s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-200 [animation-delay:-.12s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-200" />
    </span>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[.065] ${className}`} />;
}

export function InlineLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-slate-300 backdrop-blur-xl">
      <XSpinner size="sm" /> {label}
    </div>
  );
}

export function AppLoader({ label = "Checking session" }: { label?: string }) {
  return (
    <div className="grid min-h-48 place-items-center p-8 text-center">
      <div className="rounded-[28px] border border-white/10 bg-white/[.04] px-7 py-6 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl">
        <XSpinner size="lg" />
        <p className="mt-4 text-sm font-semibold text-slate-300">{label}</p>
      </div>
    </div>
  );
}
