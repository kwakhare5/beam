'use client';

import React from 'react';
import { Music, FolderInput, Timer, Calendar, Check } from 'lucide-react';

export function FeaturesGrid() {
  const engines = [
    {
      id: 'music',
      tag: 'WinRT SMTC Engine',
      title: '1. Windows Media Engine',
      summary: 'Automatic media detection with zero configuration and zero API keys.',
      desc: 'Beam integrates directly with Windows System Media Transport Controls (SMTC). When audio plays in Spotify, Apple Music, or Chrome, Beam picks up the track title, artist name, and album artwork. The resting pill displays your track and playing/paused dot; hover reveals transport controls without opening the app window.',
      points: [
        'Automatic player detection (Spotify, Apple Music, Chrome, YouTube)',
        '148px square album artwork in the expanded panel',
        'Read-only locally ticking progress bar with elapsed and total time',
        'Direct Previous, Play/Pause, and Next track controls',
      ],
    },
    {
      id: 'files',
      tag: 'In-Memory CF_HDROP',
      title: '2. In-Memory File Drop Shelf',
      summary: 'Instant batch stash with native clipboard paste and zero disk bloat.',
      desc: 'Drag files onto the Beam capsule from any folder. Beam holds the file paths in system memory (0 MB disk duplication) with a 50-file cap. Click "Copy All" to write real CF_HDROP clipboard format, allowing instant Ctrl + V pasting into Explorer, email, or messaging apps. Or drag individual rows directly out.',
      points: [
        'Native CF_HDROP clipboard output for direct Ctrl+V Explorer pasting',
        'Direct row drag-out into Explorer or external desktop applications',
        'Automatic Missing-File badge and capsule warning pip if files move',
        'All paths clear cleanly on app quit—leaves zero temporary files behind',
      ],
    },
    {
      id: 'timer',
      tag: 'Timestamp Architecture',
      title: '3. Focus Countdown Timer',
      summary: 'Precision countdowns immune to background process throttling.',
      desc: 'Start 5m, 10m, 25m presets or enter custom minutes with one click. Unlike web timers or Electron counters that freeze when Windows sleeps, Beam’s background process strictly owns the deadline timestamp. The resting capsule shows live mm:ss digits and rings a gentle audio chime with a Windows notification banner upon completion.',
      points: [
        'Accurate live countdown displayed directly on the resting capsule',
        'One-click 5m, 10m, and 25m presets plus custom 1–999 minute inputs',
        'Gentle single audio chime and native desktop notification on 0:00',
        'Golden checkmark Done face on the capsule when finished',
      ],
    },
    {
      id: 'calendar',
      tag: '100% Offline Grid',
      title: '4. Offline Month Calendar',
      summary: 'A clean date reference derived strictly from your local system clock.',
      desc: 'A quiet, distraction-free calendar view accessible in one shortcut. It follows your Windows locale week-start preference (Sunday or Monday) and highlights today’s date in Honey Gold. Chevrons navigate between adjacent months, and a Today button returns instantly.',
      points: [
        'Clean month grid derived purely from your local system clock',
        'Respects your Windows week-start locale preference',
        'Today’s date distinctly highlighted in Honey Gold only in its month',
        '100% offline—no account logins, sync permissions, or network access',
      ],
    },
  ];

  return (
    <section id="engines" className="py-24 px-6 max-w-4xl mx-auto border-t border-black/[0.06]">
      {/* Section Header */}
      <div className="mb-16">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
          Core Engine Capabilities
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink mt-2">
          Four Dedicated Engines. Zero Desktop Clutter.
        </h2>
        <p className="mt-3 text-base text-ink-muted max-w-xl leading-relaxed">
          Each engine is built specifically for everyday desktop workflows, eliminating repetitive window switching.
        </p>
      </div>

      {/* Cardless Open Editorial Layout */}
      <div className="flex flex-col gap-16">
        {engines.map((eng) => (
          <div key={eng.id} className="flex flex-col">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="px-2.5 py-0.5 rounded-pill bg-fill text-[11px] font-mono font-medium text-ink">
                {eng.tag}
              </span>
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-ink">{eng.title}</h3>
            <p className="text-sm font-medium text-ink-muted mt-1">{eng.summary}</p>

            <p className="text-sm text-ink-muted leading-relaxed mt-3 max-w-2xl">
              {eng.desc}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 mt-5 pt-4 border-t border-black/[0.06]">
              {eng.points.map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-ink/80 leading-snug">
                  <Check className="w-3.5 h-3.5 text-sel shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
