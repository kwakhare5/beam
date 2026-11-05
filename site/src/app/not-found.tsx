import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-5">
      <Image src="/mascot.svg" alt="" width={48} height={48} className="star-logo" />
      <h1 className="mt-6 text-[clamp(2.2rem,5.6vw,3.9rem)] font-semibold leading-[1]">nothing here.</h1>
      <p className="mt-3 text-[15px] text-muted">This page never made it into the bar.</p>
      <Link
        href="/"
        className="mt-8 inline-flex w-fit items-center rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
      >
        Back to beam
      </Link>
    </main>
  );
}
