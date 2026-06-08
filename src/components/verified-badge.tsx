// components/VerifiedBadge.jsx
export default function VerifiedBadge() {
  return (
    <svg
      width="16" height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="inline-block ml-1"
      title="Tasdiqlangan hisob"
    >
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
