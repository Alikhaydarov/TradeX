export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[9px] font-black leading-none text-black">
      {count > 99 ? "99+" : count}
    </span>
  );
}
