'use client';

import { useEffect, useRef, useState } from 'react';

const demoPath = process.env.NODE_ENV === 'development' ? '/demo/index.html' : '/demo';
const INSTANCE = 'hero';

export function LiveDemo() {
  const [open, setOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

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
    <div className="demo-fit" data-open={open}>
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
  );
}
