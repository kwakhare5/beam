'use client';

import React from 'react';
import Image from 'next/image';
import { Download, Github, Monitor } from 'lucide-react';
import { InteractiveStage } from './InteractiveStage';

export function Hero() {
  return (
    <section className="pt-20 pb-20 px-6 max-w-4xl mx-auto flex flex-col items-center text-center">
      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 mb-8 text-xs font-medium text-ink-muted px-3.5 py-1.5 rounded-pill bg-surface/80 border border-k-line/80 shadow-sm">
        <div className="w-4 h-4">
          <Image src="/mascot.svg" alt="Mascot" width={16} height={16} />
        </div>
        <span>Windows 11 Floating Capsule · 100% Offline · Alt + Space</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink max-w-2xl leading-[1.12]">
        Meet beam. <br />
        <span className="text-ink-muted font-normal">One Floating Bar for Everything.</span>
      </h1>

      {/* Lede Copy */}
      <p className="mt-6 text-base sm:text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
        A tiny, offline capsule anchored 12px above your Windows taskbar. Control music playback, stash batches of files, run precision countdown timers, and check the calendar—without switching windows or opening full applications.
      </p>

      {/* CTAs */}
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <a
          href="https://github.com/kwakh/beam/releases/latest"
          className="flex items-center gap-2 px-5 py-2.5 rounded-pill bg-ink text-white font-medium text-sm hover:bg-ink/85 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          <Monitor className="w-4 h-4" />
          <span>Download for Windows</span>
          <span className="text-white/40 text-xs ml-0.5 font-mono">x64</span>
        </a>

        <a
          href="https://github.com/kwakh/beam"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-pill bg-surface/90 hover:bg-fill text-ink font-medium text-sm border border-k-line transition-all shadow-sm"
        >
          <Github className="w-4 h-4" />
          <span>Star on GitHub</span>
        </a>
      </div>

      {/* Interactive Demo Callout */}
      <div className="mt-14 mb-4 flex items-center justify-center gap-2">
        <span className="text-xs font-mono font-medium text-ink-muted uppercase tracking-wider">
          Interactive Desktop Demo
        </span>
      </div>

      {/* Live Interactive Stage */}
      <InteractiveStage />
    </section>
  );
}
