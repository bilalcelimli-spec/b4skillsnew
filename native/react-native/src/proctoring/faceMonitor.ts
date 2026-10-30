export type FaceObservation = 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES';
/** Monotonic, consecutive samples only. Detection failures are never counted as zero faces. */
export class FaceMonitor {
  private last = -Infinity;
  private count: number | null = null;
  private since = 0;
  private notified = false;
  private sent = new Map<FaceObservation, number>();
  reset() { this.last = -Infinity; this.count = null; this.notified = false; }
  sample(count: number | null, ms: number): FaceObservation | null {
    if (!Number.isFinite(ms) || ms <= this.last) return null;
    const gap = ms - this.last; this.last = ms;
    if (count === null || !Number.isInteger(count) || count < 0) { this.count = null; this.notified = false; return null; }
    const category = Math.min(count, 2);
    if (gap > 2500 || category !== this.count) { this.count = category; this.since = ms; this.notified = false; }
    if (category === 1 || this.notified || ms - this.since < (category === 0 ? 5000 : 3000)) return null;
    const event = category === 0 ? 'FACE_NOT_DETECTED' : 'MULTIPLE_FACES';
    if (ms - (this.sent.get(event) ?? -Infinity) < 30000) return null;
    this.notified = true; this.sent.set(event, ms); return event;
  }
}
