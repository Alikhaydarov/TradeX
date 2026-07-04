export function XSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "size-4" : size === "lg" ? "size-8 sm:size-9" : "size-5 sm:size-6";

  return (
    <span
      className={`${sizeClass} inline-flex shrink-0 animate-spin rounded-full border-2 border-white/12 border-t-zinc-200 will-change-transform`}
      aria-label="Loading"
    />
  );
}

export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Loading">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-200 [animation-delay:-.24s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-200 [animation-delay:-.12s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-200" />
    </span>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[.065] ${className}`} />;
}

export function InlineLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-[#17181b] px-3 py-1.5 text-xs font-bold text-slate-300">
      <XSpinner size="sm" /> {label}
    </div>
  );
}

export function AppLoader({ label = "Checking session" }: { label?: string }) {
  return (
    <div className="grid min-h-40 place-items-center p-5 text-center sm:min-h-48 sm:p-8">
      <div className="rounded-[1.35rem] border border-white/8 bg-[#17181b] px-5 py-5 shadow-[0_18px_54px_rgba(0,0,0,.28)] sm:px-7 sm:py-6">
        <XSpinner size="lg" />
        <p className="mt-3 text-xs font-semibold text-slate-300 sm:mt-4 sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

export function FullScreenLoader({ label = "Opening" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[2147483646] grid place-items-center bg-[#0b0b0b]/92 px-5 text-center text-white backdrop-blur-sm">
      <div className="flex w-full max-w-[220px] flex-col items-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/8 bg-[#17181b] px-4 py-3 shadow-[0_24px_70px_rgba(0,0,0,.42)]">
          <XSpinner size="md" />
          <span className="text-xs font-black tracking-[.18em] text-zinc-100">TRADEWAY</span>
        </div>
        <p className="mt-4 text-xs font-black text-slate-100 sm:mt-5 sm:text-sm">{label}</p>
      </div>
    </div>
  );
}
