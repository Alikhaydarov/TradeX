export function DataLoader({
  label = "Loading",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={
        compact
          ? "flex min-h-11 items-center justify-center gap-2 text-sm text-neutral-400"
          : "flex min-h-48 items-center justify-center gap-2 text-sm text-neutral-400"
      }
    >
      <span className="workspace-loader-ring shrink-0" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
