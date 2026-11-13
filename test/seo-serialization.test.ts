import { expect, it } from 'vitest';
import { serializeJsonLd } from '../src/lib/site/seo-serialization';
it('cannot break out of the JSON-LD script while preserving the original data', () => {
  const value = { url: '</script><script>alert(1)</script>', text: '&<>\u2028\u2029' };
  const encoded = serializeJsonLd(value);
  expect(encoded).not.toMatch(/[<>&\u2028\u2029]/);
  expect(JSON.parse(encoded)).toEqual(value);
});
