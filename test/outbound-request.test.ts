import { describe, expect, it } from 'vitest';
import {
  isPublicAddress, parseOutboundUrl, postToPublicHttps, publicOnlyLookup, OutboundAddressError,
} from '../src/lib/security/outbound-request';

describe('outbound webhook requests stay on the public internet', () => {
  it('classifies addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) expect(isPublicAddress(ip)).toBe(true);
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.5', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0',
      '::1', '::', 'fd12::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:127.0.0.1', '224.0.0.1', 'not-an-ip']) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it('rejects unusable URLs before connecting', () => {
    for (const url of ['http://example.com/hook', 'https://user:pw@example.com/', 'https://127.0.0.1/', 'https://[::1]/',
      'https://169.254.169.254/latest/meta-data', 'https://localhost/', 'https://red-abc123:6379/', 'https://b4skills/', 'not a url']) {
      expect(() => parseOutboundUrl(url), url).toThrow(OutboundAddressError);
    }
    expect(parseOutboundUrl('https://hooks.example.com/b4skills').hostname).toBe('hooks.example.com');
  });

  it('refuses a name that resolves to a private address at connect time', async () => {
    const result = await new Promise<{ err: unknown }>((resolve) =>
      publicOnlyLookup('localhost', {}, (err) => resolve({ err })));
    expect(result.err).toBeInstanceOf(OutboundAddressError);
  });

  it('never sends to an internal address', async () => {
    await expect(postToPublicHttps('https://127.0.0.1:6379/', { headers: {}, body: '{}', timeoutMs: 1000 }))
      .rejects.toBeInstanceOf(OutboundAddressError);
  });
});
