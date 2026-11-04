'use client';

import React from 'react';
import { ShieldCheck, Cpu, WifiOff, Zap } from 'lucide-react';

export function PerformanceStrip() {
  const specs = [
    {
      label: '100% Offline',
      val: '0 Network Calls',
      detail: 'Zero telemetry, zero cloud accounts, and zero background analytics. Beam makes no network requests.',
      icon: WifiOff,
    },
    {
      label: 'Strict Memory Gate',
      val: '< 130 MB RAM',
      detail: 'Electron and C# helper strictly capped; verified in continuous automated testing before every release.',
      icon: Cpu,
    },
    {
      label: 'Idle Efficiency',
      val: '< 0.5% CPU',
      detail: 'Hardware acceleration disabled at startup to prevent RAM bloat; zero animation loops when resting.',
      icon: Zap,
    },
    {
      label: 'Windows 11 Native',
      val: 'WinRT & Win32',
      detail: 'Direct CF_HDROP clipboard format, SMTC session picker, and foreground window fullscreen hooks.',
      icon: ShieldCheck,
    },
  ];

  return (
    <section id="invariants" className="py-24 px-6 max-w-4xl mx-auto border-t border-black/[0.06]">
      {/* Section Header */}
      <div className="mb-16">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
          Hard Architectural Invariants
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink mt-2">
          Engineered to Respect Your System.
        </h2>
        <p className="mt-3 text-base text-ink-muted max-w-xl leading-relaxed">
          Beam runs as a quiet pair with your operating system, never consuming excess memory or background battery.
        </p>
      </div>

      {/* Cardless Open Metrics Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-12">
        {specs.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex flex-col items-start">
              <Icon className="w-5 h-5 text-ink mb-3 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {item.label}
              </span>
              <span className="mt-1 px-2.5 py-0.5 rounded-pill bg-fill text-xs font-mono font-bold text-ink">
                {item.val}
              </span>
              <p className="text-xs text-ink-muted mt-3 leading-relaxed">
                {item.detail}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
