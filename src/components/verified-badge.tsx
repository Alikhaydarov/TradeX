// src/components/verified-badge.tsx

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
<svg
  width={24}
  height={24}
  viewBox="0 0 24 24"
  fill="none"
  className="inline-block shrink-0"
  aria-label="Tasdiqlangan hisob"   // ← shunday yozing
>
  <title>Tasdiqlangan hisob</title>  {/* ← yoki shu ichki element sifatida */}
  <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
  <path ... />
</svg>
      <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
      <path
        d="M9 12.5L11 14.5L15.5 10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
