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
    <div className="fixed inset-0 z-[2147483646] grid place-items-center bg-[#020409]/96 px-6 text-center text-white backdrop-blur-md">
      <div className="flex w-full max-w-[220px] flex-col items-center">
        <div className="relative grid size-20 place-items-center">
          <span className="absolute inset-0 rounded-full border border-white/8" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-300 border-r-blue-500" />
          <span className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[.045] text-sm font-black text-cyan-100 shadow-xl shadow-black/30">
            TX
          </span>
        </div>
        <p className="mt-5 text-sm font-black text-slate-100">{label}</p>
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/[.06]">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-cyan-300" />
        </div>
      </div>
    </div>
  );
}
