export const QUIET_AFTER = 20000;
export const QUIET_RETURN = 2000;

export class QuietTimer {
  private quiet = false;
  private timer: number | undefined;

  constructor(
    private readonly eligible: () => boolean,
    private readonly render: () => void
  ) {}

  get active(): boolean {
    return this.quiet;
  }

  schedule(delay = QUIET_AFTER): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (!this.eligible()) {
      this.quiet = false;
      return;
    }
    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      this.quiet = this.eligible();
      this.render();
    }, delay);
  }

  wake(): void {
    this.clear();
    if (this.quiet) {
      this.quiet = false;
      this.render();
    }
  }

  reset(): void {
    this.quiet = false;
    this.schedule();
  }

  forceIdle(): void {
    this.clear();
    this.quiet = false;
  }

  private clear(): void {
    if (this.timer === undefined) return;
    window.clearTimeout(this.timer);
    this.timer = undefined;
  }
}
