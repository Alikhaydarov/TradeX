export function XSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "size-4" : size === "lg" ? "size-8 sm:size-9" : "size-5 sm:size-6";

  return (
    <span
      className={`${sizeClass} inline-flex shrink-0 animate-spin rounded-full border-2 border-white/12 border-t-cyan-200 will-change-transform`}
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
    <div className="grid min-h-40 place-items-center p-5 text-center sm:min-h-48 sm:p-8">
      <div className="rounded-3xl border border-white/8 bg-white/[.035] px-5 py-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl sm:px-7 sm:py-6">
        <XSpinner size="lg" />
        <p className="mt-3 text-xs font-semibold text-slate-300 sm:mt-4 sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

export function FullScreenLoader({ label = "Opening" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[2147483646] grid place-items-center bg-[#020409]/92 px-5 text-center text-white backdrop-blur-sm">
      <div className="flex w-full max-w-[180px] flex-col items-center sm:max-w-[220px]">
        <div className="relative grid size-16 place-items-center sm:size-20">
          <span className="absolute inset-0 rounded-full border border-white/8" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-300 border-r-blue-500" />
          <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[.045] text-xs font-black text-cyan-100 shadow-lg shadow-black/25 sm:size-14 sm:text-sm">
            TX
          </span>
        </div>
        <p className="mt-4 text-xs font-black text-slate-100 sm:mt-5 sm:text-sm">{label}</p>
        <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-white/[.06] sm:mt-4 sm:h-1">
          <span className="block h-full w-2/3 animate-pulse rounded-full bg-cyan-300" />
        </div>
      </div>
    </div>
  );
}
