export class UndoSlot {
  private path: string | null = null;
  private timer: number | undefined;

  constructor(
    private readonly onChange: () => void,
    private readonly windowMs = 5000
  ) {}

  get value(): string | null {
    return this.path;
  }

  arm(path: string): void {
    this.cancel();
    this.path = path;
    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      this.path = null;
      this.onChange();
    }, this.windowMs);
    this.onChange();
  }

  clear(): void {
    const had = this.path !== null;
    this.cancel();
    if (had) this.onChange();
  }

  private cancel(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.path = null;
  }
}
