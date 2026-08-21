import type { ChatPresenceMeta } from "@/features/community-chat/types";

export function TypingIndicator({ users }: { users: ChatPresenceMeta[] }) {
  if (!users.length) return <div className="h-5" />;
  const names = users.slice(0, 2).map((user) => user.fullName || user.username);
  const label = users.length === 1
    ? `${names[0]} is typing`
    : users.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names[0]}, ${names[1]} and others are typing`;

  return (
    <div className="flex h-5 items-center gap-2 px-1 text-[10px] text-ink-subtle" aria-live="polite">
      <span className="flex items-center gap-0.5">
        <span className="size-1 animate-bounce rounded-full bg-zinc-500 [animation-delay:-.2s]" />
        <span className="size-1 animate-bounce rounded-full bg-zinc-500 [animation-delay:-.1s]" />
        <span className="size-1 animate-bounce rounded-full bg-zinc-500" />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}
