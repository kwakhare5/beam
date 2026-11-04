'use client';

import React from 'react';
import { Eye, Maximize2, Move, Shield } from 'lucide-react';

export function CapsuleMechanics() {
  const steps = [
    {
      num: '01',
      badge: '94×30 Resting',
      title: 'Resting State: One Fact at a Glance',
      desc: 'Beam sits 12px above your primary taskbar and never steals window focus. When idle, it shows the 24px star mark at 70% opacity. When media or files are active, it shows exactly one fact: your live track title, file count, or remaining countdown.',
      icon: Eye,
    },
    {
      num: '02',
      badge: '128×30 Hover',
      title: 'Hover State: Instant Transport Controls',
      desc: 'Hovering over the capsule expands it horizontally to 128px over 120ms without resizing the native Windows boundary. It swaps the title for direct Previous, Play/Pause, Next, and panel open controls.',
      icon: Move,
    },
    {
      num: '03',
      badge: '150ms Spring',
      title: 'Panel Expand: Four Dedicated Engines',
      desc: 'Clicking the capsule or pressing Alt + Space expands the 420×284 panel upward in 150ms. It auto-picks the active task (Timer if counting down, Music if playing, or your last visited tab) and collapses cleanly on Escape.',
      icon: Maximize2,
    },
    {
      num: '04',
      badge: 'Fullscreen Auto-Hide',
      title: 'Zero Interference with Games & Movies',
      desc: 'A background Windows hook monitors the foreground window. When you launch a fullscreen game, video, or presentation, Beam automatically hides itself completely. Exiting fullscreen restores the capsule instantly.',
      icon: Shield,
    },
  ];

  return (
    <section id="mechanics" className="py-24 px-6 max-w-4xl mx-auto border-t border-black/[0.06]">
      <div className="mb-16">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
          Capsule Interaction Lifecycle
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink mt-2">
          Designed to Never Block Your Screen.
        </h2>
        <p className="mt-3 text-base text-ink-muted max-w-xl leading-relaxed">
          Desktop context switching disrupts your focus. Beam stays completely unobtrusive, giving you 1-click access only when you need it.
        </p>
      </div>

      {/* Cardless Editorial Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-14">
        {steps.map((st) => {
          const Icon = st.icon;
          return (
            <div key={st.num} className="flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-xs font-bold text-ink-muted/60">{st.num}</span>
                <span className="px-2.5 py-0.5 rounded-pill bg-fill text-[11px] font-mono font-medium text-ink">
                  {st.badge}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-ink shrink-0" />
                <h3 className="text-lg font-bold tracking-tight text-ink">{st.title}</h3>
              </div>

              <p className="text-sm text-ink-muted leading-relaxed">
                {st.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
