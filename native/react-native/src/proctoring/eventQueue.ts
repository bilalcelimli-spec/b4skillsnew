import type { NativeEvent } from './protocol';
import { NATIVE_PLATFORMS } from './platform';
export type QueueStorage = { read(): Promise<string | null>; write(value: string): Promise<void> };
type State = { version: 1; nextSequence: number; events: NativeEvent[] };
export const MAX_QUEUED_EVENTS = 128;
function validEvent(event: NativeEvent): boolean {
  return event?.version === 2 && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(event.eventId)
    && /^[a-z0-9_-]{1,100}$/i.test(event.sessionId) && NATIVE_PLATFORMS.includes(event.platform)
    && ['TAB_BLUR', 'TAB_FOCUS', 'OTHER', 'FACE_NOT_DETECTED', 'MULTIPLE_FACES'].includes(event.eventType) && event.severity === 'INFO'
    && Number.isSafeInteger(event.sequence) && event.sequence >= 0
    && typeof event.timestamp === 'string' && event.timestamp.length <= 40 && Number.isFinite(Date.parse(event.timestamp))
    && typeof event.metadata?.reason === 'string' && event.metadata.reason.length <= 500;
}

/** Persist before delivery; delete only after a validated server ACK and successful local save. */
export class EventQueue {
  private state?: State;
  private serial: Promise<unknown> = Promise.resolve();
  private draining?: Promise<void>;
  constructor(private storage: QueueStorage, private send: (event: NativeEvent) => Promise<void>, private newId: () => Promise<string>) {}

  private locked<T>(work: () => Promise<T>): Promise<T> {
    const next = this.serial.then(work);
    this.serial = next.catch(() => {});
    return next;
  }
  private async load(): Promise<State> {
    if (!this.state) {
      const value = await this.storage.read();
      if (value && value.length > 100000) throw new Error('Gözetim kuyruğu sınırı aşıldı. Destek ile iletişime geçin.');
      const state = value ? JSON.parse(value) : { version: 1, nextSequence: 0, events: [] };
      if (state.version !== 1 || !Number.isSafeInteger(state.nextSequence) || state.nextSequence < 0 || !Array.isArray(state.events) || state.events.length > MAX_QUEUED_EVENTS || state.events.some((e: NativeEvent) => !validEvent(e) || e.sequence >= state.nextSequence) || new Set(state.events.map((e: NativeEvent) => e.eventId)).size !== state.events.length) throw new Error('Gözetim kuyruğu okunamadı. Destek ile iletişime geçin.');
      this.state = state;
    }
    return this.state!;
  }
  private async save(next: State) {
    const value = JSON.stringify(next);
    if (value.length > 100000) throw new Error('Gözetim kuyruğu dolu. Bağlantıyı kontrol edip yeniden deneyin.');
    await this.storage.write(value);
    this.state = next;
  }
  async checkStorage() { await this.locked(async () => { await this.save(await this.load()); }); }
  async pending() { return this.locked(async () => (await this.load()).events.length); }
  async append(event: Omit<NativeEvent, 'version' | 'eventId' | 'sequence' | 'timestamp'>) {
    return this.locked(async () => {
      const state = await this.load();
      if (state.events.length >= MAX_QUEUED_EVENTS || state.nextSequence >= Number.MAX_SAFE_INTEGER) throw new Error('Gözetim kuyruğu dolu. Bağlantıyı kontrol edip yeniden deneyin.');
      const entry: NativeEvent = { ...event, version: 2, eventId: await this.newId(), sequence: state.nextSequence, timestamp: new Date().toISOString() };
      if (!validEvent(entry)) throw new Error('Geçersiz gözetim olayı.');
      await this.save({ version: 1, nextSequence: state.nextSequence + 1, events: [...state.events, entry] });
    });
  }
  flush(shouldContinue: () => boolean = () => true): Promise<void> {
    if (this.draining) return this.draining;
    const run = async () => {
      while (shouldContinue()) {
        const event = await this.locked(async () => (await this.load()).events[0]);
        if (!event || !shouldContinue()) return;
        await this.send(event); // Does not block new events from being saved during a slow request.
        await this.locked(async () => {
          const state = await this.load();
          await this.save({ ...state, events: state.events.filter(e => e.eventId !== event.eventId) });
        });
      }
    };
    this.draining = run().finally(() => { this.draining = undefined; });
    return this.draining;
  }
}
