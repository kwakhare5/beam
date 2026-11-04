'use client';

import React from 'react';
import Image from 'next/image';
import { Download, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="pt-20 pb-28 px-6 max-w-4xl mx-auto border-t border-black/[0.06] flex flex-col items-center">
      {/* Pre-footer Call to Action (Cardless & Boxless) */}
      <div className="w-full text-center mb-20 flex flex-col items-center">
        <div className="w-12 h-12 mb-5">
          <Image src="/mascot.svg" alt="Puffy Chubby Star" width={48} height={48} />
        </div>

        <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          Ready to Unclutter Your Desktop?
        </h3>
        <p className="mt-3 text-base text-ink-muted max-w-md mx-auto leading-relaxed">
          Offline, tiny, and stays completely quiet until you need it.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://github.com/kwakh/beam/releases/latest"
            className="flex items-center gap-2 px-6 py-2.5 rounded-pill bg-ink text-white font-medium text-sm hover:bg-ink/85 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>Download Beam for Windows</span>
          </a>

          <a
            href="https://github.com/kwakh/beam"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-pill bg-surface hover:bg-fill text-ink font-medium text-sm border border-k-line transition-all shadow-sm"
          >
            <Github className="w-4 h-4" />
            <span>View Source on GitHub</span>
          </a>
        </div>
      </div>

      {/* Baseline Bottom Bar */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted border-t border-black/[0.06] pt-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4">
            <Image src="/mascot.svg" alt="Star" width={16} height={16} />
          </div>
          <span className="font-semibold text-ink">beam.</span>
          <span>© 2026 Karan. Released under the MIT License.</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/kwakh/beam"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://github.com/kwakh/beam/blob/main/DESIGN.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            Design Tokens
          </a>
          <a
            href="https://github.com/kwakh/beam/blob/main/ARCHITECTURE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            Architecture
          </a>
        </div>
      </div>
    </footer>
  );
}
