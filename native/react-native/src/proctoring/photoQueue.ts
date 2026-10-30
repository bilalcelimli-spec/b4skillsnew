import type { CameraPhoto } from '../native';
import { NATIVE_PLATFORMS, type NativePlatform } from './platform';
import type { QueueStorage } from './eventQueue';
export type QueuedPhoto = CameraPhoto & { evidenceId: string; sessionId: string; platform: NativePlatform; failure?: 'expired' | 'rejected' | 'quota' };
const valid = (p: QueuedPhoto) => p && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.evidenceId) && /^[a-z0-9_-]{1,100}$/i.test(p.sessionId)
  && NATIVE_PLATFORMS.includes(p.platform) && p.faceCount === 1 && /^[0-9a-f]{64}$/.test(p.sha256)
  && Number.isInteger(p.bytes) && p.bytes > 0 && p.bytes <= 1000000 && typeof p.base64 === 'string'
  && p.base64.length <= 1333336 && p.base64.length >= 4 && /^[A-Za-z0-9+/]+={0,2}$/.test(p.base64)
  && Number.isFinite(Date.parse(p.capturedAt)) && (!p.failure || ['expired', 'rejected', 'quota'].includes(p.failure));
/** An approved image is persisted before transmission. Lost ACKs retain the same immutable UUID. */
export class PhotoQueue {
  private entries?: QueuedPhoto[];
  private serial: Promise<unknown> = Promise.resolve();
  private draining?: Promise<void>;
  constructor(private storage: QueueStorage, private send: (photo: QueuedPhoto, current: () => boolean) => Promise<void>, private now = Date.now) {}
  private lock<T>(work: () => Promise<T>): Promise<T> { const p = this.serial.then(work); this.serial = p.catch(() => {}); return p; }
  private async load() {
    if (!this.entries) {
      const raw = await this.storage.read();
      if (raw && raw.length > 5500000) throw new Error('Fotoğraf kuyruğu sınırı aşıldı.');
      const state = raw ? JSON.parse(raw) : { version: 1, entries: [] };
      if (state.version !== 1 || !Array.isArray(state.entries) || state.entries.length > 4 || !state.entries.every(valid)
        || new Set(state.entries.map((p: QueuedPhoto) => p.evidenceId)).size !== state.entries.length) throw new Error('Şifreli fotoğraf kuyruğu doğrulanamadı. Kayıtlar korunuyor.');
      this.entries = state.entries as QueuedPhoto[];
    }
    return this.entries!;
  }
  private async save(entries: QueuedPhoto[]) {
    const value = JSON.stringify({ version: 1, entries });
    if (value.length > 5500000) throw new Error('Fotoğraf kuyruğu dolu. Teslimi tamamlayın veya bekleyen fotoğrafı silin.');
    await this.storage.write(value); this.entries = entries;
  }
  async checkStorage() { await this.lock(async () => this.save(await this.load())); }
  async status() { return this.lock(async () => (await this.load()).map(({ evidenceId, failure, sessionId }) => ({ evidenceId, failure, sessionId }))); }
  async append(photo: QueuedPhoto) {
    await this.lock(async () => {
      if (!valid(photo) || photo.failure) throw new Error('Geçersiz fotoğraf. Yeniden çekin.');
      const entries = await this.load(), existing = entries.find(p => p.evidenceId === photo.evidenceId);
      if (existing) { if (JSON.stringify(existing) !== JSON.stringify(photo)) throw new Error('Fotoğraf kimliği başka içerikle kullanılamaz.'); return; }
      if (entries.length >= 4) throw new Error('Fotoğraf kuyruğu dolu. Bekleyen kayıtları kontrol edin.');
      if (this.now() - Date.parse(photo.capturedAt) > 600000 || Date.parse(photo.capturedAt) > this.now() + 60000) throw new Error('Fotoğrafın gönderim süresi doldu. Yeniden çekin.');
      await this.save([...entries, photo]);
    });
  }
  async discard(evidenceId: string) { await this.lock(async () => this.save((await this.load()).filter(p => p.evidenceId !== evidenceId))); }
  flush(current: () => boolean = () => true): Promise<void> {
    if (this.draining) return this.draining;
    const run = async () => {
      while (current()) {
        const photo = await this.lock(async () => (await this.load()).find(p => !p.failure));
        if (!photo || !current()) return;
        // Always retry an already-approved UUID, even after ten minutes: a lost ACK
        // may correspond to an already committed server object. The server decides expiry.
        let failure: QueuedPhoto['failure'];
        try { await this.send(photo, current); }
        catch (error) {
          if (!current()) throw error;
          const { status, code } = error as { status?: number; code?: string };
          if (status === 410 || code === 'EVIDENCE_CAPTURE_EXPIRED') failure = 'expired';
          else if (status === 429 && code === 'EVIDENCE_QUOTA') failure = 'quota';
          else if (status && [400, 403, 404, 409, 422].includes(status)) failure = 'rejected';
          else throw error;
        }
        await this.lock(async () => {
          const entries = await this.load();
          await this.save(failure ? entries.map(p => p.evidenceId === photo.evidenceId ? { ...p, failure } : p) : entries.filter(p => p.evidenceId !== photo.evidenceId));
        });
      }
    };
    this.draining = run().finally(() => { this.draining = undefined; }); return this.draining;
  }
}
