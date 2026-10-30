export type MediaResource = 'playback' | 'microphone' | 'camera';
/** Shared owner registry: future camera monitoring must use the same lease boundary. */
export class ProctoringCoordinator {
  private owners = new Map<MediaResource, { owner: symbol; stop: () => void }>();
  stop(resource: MediaResource) { this.owners.get(resource)?.stop(); }
  acquire(resource: MediaResource, owner: symbol, stop: () => void): () => void {
    if (resource === 'playback' && this.owners.has('microphone')) throw new Error('Ses kaydı sürerken dinleme başlatılamaz.');
    const current = this.owners.get(resource);
    if (current && current.owner !== owner) throw new Error('Medya kaynağı başka bir işlem tarafından kullanılıyor.');
    if (resource === 'microphone') this.owners.get('playback')?.stop();
    this.owners.set(resource, { owner, stop });
    return () => { if (this.owners.get(resource)?.owner === owner) this.owners.delete(resource); };
  }
}
export const proctoringCoordinator = new ProctoringCoordinator();
