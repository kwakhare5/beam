export function HandArrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 110" width={56} height={68} fill="none" aria-hidden="true" className={className}>
      <path
        d="M84 8C80 30 74 52 60 70C52 82 36 96 22 104"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M22 104 46 100M22 104 35 82"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
