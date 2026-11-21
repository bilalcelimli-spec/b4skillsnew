import { CEFR_GUIDE_PATHS } from '../lib/site/cefr-guides';
const GTM = 'GTM-WVFFCWJM';
const KEY = 'b4skills_analytics_consent_v1';
const PUBLIC_PATHS = new Set([...CEFR_GUIDE_PATHS, '/', '/pricing', '/methodology', '/research', '/accessibility-statement', '/schools', '/academia', '/corporate', '/language-schools', '/english-level-test', '/ingilizce-seviye-testi', '/cefr-english-test', '/english-assessment-for-universities', '/english-assessment-for-companies']);
type Choice = 'accepted' | 'rejected' | null;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; 'ga-disable-G-MEQ1P6RNEH'?: boolean };
let loaded = false;
let lastPath = '';
export function isPublicMarketingPath(path: string) { return PUBLIC_PATHS.has(path); }
export function analyticsChoice(): Choice {
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); return saved && Date.now() - saved.at < 180 * 86400000 && ['accepted', 'rejected'].includes(saved.value) ? saved.value : null; } catch { return null; }
}
// Google tag commands use the documented Arguments-object queue format.
// eslint-disable-next-line prefer-rest-params
function command(..._args: unknown[]) { ((window as AnalyticsWindow).dataLayer ??= []).push(arguments); }
export function disableMarketingMeasurement() {
  (window as AnalyticsWindow)['ga-disable-G-MEQ1P6RNEH'] = true;
  lastPath = '';
  if (loaded) command('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
}
export function setAnalyticsChoice(value: Exclude<Choice, null>) {
  try { localStorage.setItem(KEY, JSON.stringify({ value, at: Date.now() })); } catch { /* Without stored consent measurement stays disabled. */ }
  if (value === 'rejected') { disableMarketingMeasurement(); if (loaded) window.location.reload(); }
}
export function measureMarketingPage(path: string) {
  const host = window.location.hostname;
  if (!['www.b4skills.com', 'b4skills.com', 'localhost', '127.0.0.1'].includes(host) || analyticsChoice() !== 'accepted' || !isPublicMarketingPath(path)) { disableMarketingMeasurement(); return; }
  const w = window as AnalyticsWindow;
  w['ga-disable-G-MEQ1P6RNEH'] = false;
  if (lastPath === path) return;
  const page = { page_location: window.location.origin + path, page_path: path, page_title: path, page_referrer: '' };
  w.dataLayer ??= [];
  if (!loaded) {
    command('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    command('set', { ...page, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    command('consent', 'update', { analytics_storage: 'granted' });
    w.dataLayer.push(page, { 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script'); script.async = true; script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM}`; document.head.appendChild(script);
    loaded = true;
  } else { command('consent', 'update', { analytics_storage: 'granted' }); command('set', page); }
  w.dataLayer.push({ event: 'b4_page_view', ...page });
  lastPath = path;
}
