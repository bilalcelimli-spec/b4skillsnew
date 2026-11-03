import { describe, expect, it } from 'vitest';
import { render } from '../src/entry-server';

describe('public pages render without a browser', () => {
  it.each(['/', '/pricing', '/research', '/methodology', '/verify', '/privacy', '/kvkk', '/terms', '/support', '/refund-policy', '/sales-terms'])(
    'renders substantive HTML for %s', path => {
      const result = render(path);
      expect(result.didSSR).toBe(true);
      expect(result.html).toContain('<h1');
    },
  );
  it('provides a real contact target and removes unsupported endorsement claims', () => {
    const html = render('/').html;
    expect(html).toContain('id="contact"');
    expect(html).toContain('CEFR-aligned');
    expect(html).not.toMatch(/CEFR Certified|National Science Academy|EduCorp|Ankara Bilim|98\.5%/);
  });
  it('does not conflate reliability coefficients or claim calibrated active status', () => {
    const html = render('/methodology').html;
    expect(html).not.toMatch(/ICC ≥ 0\.85|validated against anchor items shared|All items are calibrated/);
    expect(render('/research').html).not.toContain('≥ 200 calibration responses');
  });
});
