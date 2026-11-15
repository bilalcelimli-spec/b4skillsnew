import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isPublicMarketingPath } from '../src/services/marketingMeasurement';

test('only public information routes can be measured, never authenticated or child records', () => {
  for (const path of ['/', '/pricing', '/methodology', '/schools', '/english-level-test']) assert.equal(isPublicMarketingPath(path), true);
  for (const path of ['/login', '/today', '/dashboard', '/students', '/share/123', '/guardian-consent/123', '/payment/success', '/exam/new', '/results', '/assessment', '/parent', '/api/family/privacy', '/unknown', '/contact?email=x@example.test']) assert.equal(isPublicMarketingPath(path), false, path);
});

test('consent gates loading, strips page data and disables on private paths and tenant hosts', async () => {
  const { measureMarketingPage, setAnalyticsChoice } = await import('../src/services/marketingMeasurement');
  const saved = new Map<string, string>();
  const scripts: unknown[] = [];
  const fakeWindow = { location: { hostname: 'www.b4skills.com', origin: 'https://www.b4skills.com', search: '?email=private@example.test', hash: '#secret', reload() {} }, dataLayer: [] as any[] };
  const prior = { window: Object.getOwnPropertyDescriptor(globalThis, 'window'), document: Object.getOwnPropertyDescriptor(globalThis, 'document'), localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage') };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({}), head: { appendChild: (s: unknown) => scripts.push(s) } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => saved.set(k, v) } });
  try {
    measureMarketingPage('/'); assert.equal(scripts.length, 0);
    setAnalyticsChoice('accepted'); measureMarketingPage('/'); measureMarketingPage('/');
    assert.equal(scripts.length, 1);
    let views = fakeWindow.dataLayer.filter(x => x.event === 'b4_page_view');
    assert.equal(views.length, 1); assert.equal(views[0].page_location, 'https://www.b4skills.com/');
    assert.equal(views[0].page_title, '/'); assert.equal(views[0].page_referrer, '');
    assert(!JSON.stringify(fakeWindow.dataLayer).includes('private@example.test'));
    measureMarketingPage('/students/42'); assert.equal((fakeWindow as any)['ga-disable-G-MEQ1P6RNEH'], true);
    fakeWindow.location.hostname = 'club.b4skills.com'; measureMarketingPage('/');
    views = fakeWindow.dataLayer.filter(x => x.event === 'b4_page_view'); assert.equal(views.length, 1);
    setAnalyticsChoice('rejected'); assert.equal((fakeWindow as any)['ga-disable-G-MEQ1P6RNEH'], true);
  } finally { for (const [key, descriptor] of Object.entries(prior)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]; } }
});
