'use client';

import { useEffect, useState } from 'react';

export function LiveDemo() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; instance?: string; open?: boolean } | null;
      if (!data || data.source !== 'beam-demo' || data.instance !== 'hero' || typeof data.open !== 'boolean') return;
      setOpen(data.open);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="demo-fit" data-open={open}>
      <div className="demo-stage" data-open={open}>
        <iframe src="/demo?instance=hero" title="beam — live app demo" className="demo-frame" data-open={open} loading="lazy" />
      </div>
    </div>
  );
}
