export class Timer {
  private _timer: NodeJS.Timeout | null = null;

  public constructor(private readonly _callback: () => void, private readonly _timeMs: number) {}

  public restart(): void {
    this.stop();
    this._timer = setTimeout(this._callback, this._timeMs);
  }

  public stop(): void {
    if (this._timer !== null) {
      clearTimeout(this._timer);
    }
  }
}
