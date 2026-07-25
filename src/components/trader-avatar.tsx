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
  src,
  className,
}: {
  name: string;
  value?: string | null;
  src?: string | null;
  className?: string;
}) {
  const resolvedValue = value ?? src;
  const imageUrl =
    resolvedValue?.startsWith("http://") || resolvedValue?.startsWith("https://")
      ? resolvedValue
      : null;
  const label = imageUrl
    ? initials(name)
    : resolvedValue?.slice(0, 2) || initials(name) || "TW";

  return (
    <span
      aria-label={`${name} avatari`}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-100 via-zinc-500 to-zinc-900 font-black text-white shadow-inner shadow-white/10",
        className,
      )}
      style={
        imageUrl
          ? {
              backgroundImage: `url("${imageUrl.replaceAll('"', "%22")}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {!imageUrl && label}
    </span>
  );
}
