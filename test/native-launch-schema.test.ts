import { describe, expect, it } from 'vitest';
import { SessionLaunchBody } from '../src/lib/security/schemas/sessions';

describe('native launch receipt contract', () => {
  it('accepts a UUID receipt without a client candidate or organization', () => {
    expect(SessionLaunchBody.parse({ productLine: 'General English', launchRequestId: '716e724c-f93e-4684-a1a2-b611bc67d823' })).toMatchObject({ launchRequestId: '716e724c-f93e-4684-a1a2-b611bc67d823' });
  });
  it('preserves compatibility with existing clients without receipts', () => {
    expect(SessionLaunchBody.safeParse({ productLine: 'General English' }).success).toBe(true);
  });
  it.each(['', 'not-a-uuid', 'x'.repeat(1000)])('rejects an invalid receipt', launchRequestId => {
    expect(SessionLaunchBody.safeParse({ productLine: 'General English', launchRequestId }).success).toBe(false);
  });
});
