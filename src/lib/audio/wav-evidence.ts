/** Container evidence only: mono/stereo is not the number of speakers. */
export function inspectWav(bytes: Buffer): { valid: boolean; reason?: string; durationSeconds?: number; channels?: number } {
  if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE')
    return { valid: false, reason: 'Missing RIFF/WAVE signature' };
  const end = bytes.readUInt32LE(4) + 8;
  if (end > bytes.length) return { valid: false, reason: 'Declared RIFF size exceeds file size' };
  let rate = 0, channels = 0, dataSize = 0;
  for (let offset = 12; offset + 8 <= end;) {
    const name = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > end) return { valid: false, reason: 'Truncated WAV chunk' };
    if (name === 'fmt ' && size >= 16) {
      channels = bytes.readUInt16LE(start + 2); rate = bytes.readUInt32LE(start + 8);
    }
    if (name === 'data') dataSize += size;
    offset = start + size + (size % 2);
  }
  if (!channels || !rate || !dataSize) return { valid: false, reason: 'Missing format or non-empty data chunk' };
  return { valid: true, durationSeconds: dataSize / rate, channels };
}
