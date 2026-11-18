'use client';

import { useEffect, useRef, useState } from 'react';

const demoPath = process.env.NODE_ENV === 'development' ? '/demo/index.html' : '/demo';
const INSTANCE = 'hero';
const STAGE_WIDTH = 452;

export function LiveDemo() {
  const [open, setOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const requestClose = () => {
    frameRef.current?.contentWindow?.postMessage(
      { source: 'beam-host', instance: INSTANCE, type: 'close' },
      window.location.origin
    );
  };

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const update = () => {
      const available = shell.clientWidth + (window.innerWidth <= 520 ? 40 : 0);
      const scale = Math.min(1, available / STAGE_WIDTH);
      fitRef.current?.style.setProperty('--demo-scale', String(scale));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('.demo-shell')) return;
      requestClose();
    };
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [open]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; instance?: string; type?: string } | null;
      if (!data || data.source !== 'beam-demo' || data.instance !== INSTANCE) return;
      if (data.type === 'open-request') {
        setOpen(true);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            frameRef.current?.contentWindow?.postMessage(
              { source: 'beam-host', instance: INSTANCE, type: 'resized' },
              window.location.origin
            );
          })
        );
      }
      if (data.type === 'closed') setOpen(false);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (rect.bottom <= window.innerHeight - 16 && rect.top >= 72) return;
      stage.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }, 240);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <div className="demo-shell flex w-full flex-col" ref={shellRef}>
      <div className="demo-fit" data-open={open} ref={fitRef}>
        <div className="demo-stage" data-open={open} ref={stageRef}>
          <iframe
            src={`${demoPath}?instance=${INSTANCE}`}
            title="beam live app demo"
            className="demo-frame"
            data-open={open}
            loading="lazy"
            ref={frameRef}
          />
        </div>
      </div>
      {open && (
        <button
          type="button"
          className="demo-close mt-3 flex min-h-[44px] items-center self-center rounded-lg border border-hairline bg-surface px-4 text-[13px] text-muted transition-colors hover:bg-hover hover:text-ink sm:hidden"
          onClick={requestClose}
        >
          close demo
        </button>
      )}
    </div>
  );
}
