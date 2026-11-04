'use client';

import React from 'react';
import Image from 'next/image';
import { Download, Github } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-6 z-50 max-w-4xl mx-auto px-4">
      <nav className="bg-surface/90 backdrop-blur-md border border-k-line rounded-pill px-4 py-2.5 flex items-center justify-between shadow-card">
        {/* Brand */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="relative w-6 h-6 transition-transform group-hover:scale-110 duration-200">
            <Image
              src="/mascot.svg"
              alt="Beam Mascot"
              width={24}
              height={24}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span className="font-semibold text-base tracking-tight text-ink">beam.</span>
        </a>

        {/* Navigation Anchors */}
        <div className="hidden sm:flex items-center gap-7 text-sm font-medium text-ink-muted">
          <a href="#mechanics" className="hover:text-ink transition-colors">Mechanics</a>
          <a href="#engines" className="hover:text-ink transition-colors">Engines</a>
          <a href="#invariants" className="hover:text-ink transition-colors">Invariants</a>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com/kwakh/beam"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink bg-fill/50 hover:bg-fill rounded-pill transition-colors border border-k-line/60"
            title="Star on GitHub"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">GitHub</span>
          </a>

          <a
            href="https://github.com/kwakh/beam/releases/latest"
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-ink hover:bg-ink/85 rounded-pill transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
