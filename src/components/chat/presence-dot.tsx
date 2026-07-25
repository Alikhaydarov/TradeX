export function PresenceDot({ online, className = "" }: { online: boolean; className?: string }) {
  return (
    <span
      aria-label={online ? "Online" : "Offline"}
      className={`inline-block size-2 rounded-full border border-black ${online ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.45)]" : "bg-zinc-700"} ${className}`}
    />
  );
}
