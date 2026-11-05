export function HandArrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 60" width={56} height={52} fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 8C24 5 43 17 47 34C49 44 55 51 62 56"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M62 56 46 53M62 56 56 40"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
