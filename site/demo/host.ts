type HostMessage = { source?: string; instance?: string; type?: string };

export class DemoHost {
  private onResized: (() => void) | null = null;
  private onClose: (() => void) | null = null;
  private readonly parent = window.parent !== window ? window.parent : null;

  constructor(private readonly instance: string) {
    window.addEventListener('message', (event) => {
      if (!this.parent || event.source !== this.parent) return;
      const data = event.data as HostMessage | null;
      if (!data || data.source !== 'beam-host' || data.instance !== this.instance) return;
      if (data.type === 'close') {
        this.onClose?.();
        return;
      }
      if (data.type !== 'resized') return;
      const run = this.onResized;
      this.onResized = null;
      run?.();
    });
  }

  requestOpen(open: () => void): void {
    if (!this.parent) {
      open();
      return;
    }
    this.onResized = open;
    this.parent.postMessage({ source: 'beam-demo', instance: this.instance, type: 'open-request' }, '*');
    window.setTimeout(() => {
      if (!this.onResized) return;
      const run = this.onResized;
      this.onResized = null;
      run();
    }, 500);
  }

  requestClosed(): void {
    this.parent?.postMessage({ source: 'beam-demo', instance: this.instance, type: 'closed' }, '*');
  }

  onCloseRequest(handler: () => void): void {
    this.onClose = handler;
  }
}
