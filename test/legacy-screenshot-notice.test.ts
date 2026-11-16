import {expect,it} from 'vitest';
import {legacyScreenshotNotice} from '../src/lib/compliance/legacy-screenshot-notice';
const date=new Date('2026-09-28T18:23:15Z');
const marker={reason:'periodic',timestamp:date.toISOString()};
it('distinguishes a capture notice from stored media',()=>{
 expect(legacyScreenshotNotice(marker,date)).toBe('legacy-capture-attempt');
 expect(legacyScreenshotNotice({reason:'periodic',capturedAt:date.toISOString(),frameLength:123},date)).toBe('legacy-frame-length-only');
});
it.each([{...marker,evidenceKey:'image.jpg'},{...marker,reference:{key:'image.jpg'}},{...marker,frame:'base64'}, {...marker,unknown:true}, {reason:'periodic'},null])('does not classify unknown or actual media: %j',metadata=>{
 expect(legacyScreenshotNotice(metadata,date)).toBeNull();
});
it('does not exempt new records or invalid timestamps',()=>{
 expect(legacyScreenshotNotice(marker,new Date('2026-09-30'))).toBeNull();
 expect(legacyScreenshotNotice({...marker,timestamp:'invalid'},date)).toBeNull();
 expect(legacyScreenshotNotice(marker,new Date('invalid'))).toBeNull();
});
