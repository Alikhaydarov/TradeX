import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TraderAvatar({
  name,
  value,
  className,
}: {
  name: string;
  value?: string | null;
  className?: string;
}) {
  const imageUrl = value?.startsWith("http://") || value?.startsWith("https://")
    ? value
    : null;
  const label = imageUrl ? initials(name) : value?.slice(0, 2) || initials(name) || "TX";

  return (
    <span
      aria-label={`${name} avatari`}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 font-black text-white shadow-inner shadow-white/10",
        className,
      )}
      style={imageUrl ? {
        backgroundImage: `url("${imageUrl.replaceAll('"', "%22")}")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      } : undefined}
    >
      {!imageUrl && label}
    </span>
  );
}
