import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg text-ink text-center">
      <h2 className="text-3xl font-bold tracking-tight mb-2">404 - Page Not Found</h2>
      <p className="text-ink-muted mb-6">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-pill bg-ink text-white text-xs font-semibold hover:bg-ink/80 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
