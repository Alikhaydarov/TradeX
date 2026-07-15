export function VerifiedBadge({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`inline-block shrink-0 drop-shadow-[0_0_5px_rgba(29,155,240,.22)] ${className}`}
      aria-label="Tasdiqlangan hisob"
    >
      <title>Tasdiqlangan hisob</title>
      <path
        d="M12 1.35 14.28 3l2.79-.25 1.08 2.58 2.46 1.34-.72 2.7L21.35 12l-1.46 2.63.72 2.7-2.46 1.34-1.08 2.58-2.79-.25L12 22.65 9.72 21l-2.79.25-1.08-2.58-2.46-1.34.72-2.7L2.65 12l1.46-2.63-.72-2.7 2.46-1.34 1.08-2.58L9.72 3 12 1.35Z"
        fill="#1D9BF0"
      />
      <path
        d="m8.35 12.1 2.35 2.35 4.95-5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
