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

export function FullScreenLoader({ label = "Opening" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[2147483646] grid place-items-center bg-[#02050b]/94 px-6 text-center text-white backdrop-blur-xl">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative grid size-24 place-items-center rounded-[30px] border border-cyan-200/15 bg-[#07101d] shadow-2xl shadow-cyan-950/30">
          <span className="absolute inset-3 rounded-[24px] border border-white/8" />
          <XSpinner size="lg" />
        </div>
        <p className="mt-5 text-sm font-black text-slate-100">{label}</p>
        <p className="mt-1 text-xs text-slate-500">TradeX tayyorlanmoqda</p>
      </div>
    </div>
  );
}
