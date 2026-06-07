export function XSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-9 w-9" : "h-6 w-6";

  return (
    <span
      className={`${sizeClass} inline-block animate-spin rounded-full border-2 border-slate-600 border-t-white`}
      aria-label="Yuklanmoqda"
    />
  );
}

export function AppLoader({ label = "Yuklanmoqda" }: { label?: string }) {
  return (
    <div className="grid min-h-48 place-items-center p-8 text-center">
      <div>
        <XSpinner size="lg" />
        <p className="mt-4 text-sm font-semibold text-slate-300">{label}</p>
      </div>
    </div>
  );
}
