import { messages, translate, translateMessage, resolveLanguage } from '../src/i18n/core';

it('provides English and Arabic copy with matching interpolation placeholders', () => {
  expect(Object.keys(messages).length).toBeGreaterThan(300);
  for (const [source, translations] of Object.entries(messages)) {
    const placeholders = (text: string) => [...text.matchAll(/\{\d+\}/g)].map(match => match[0]).sort();
    for (const value of [translations.en, translations.ar]) {
      expect(value.trim()).not.toBe('');
      expect({ source, placeholders: placeholders(value) }).toEqual({ source, placeholders: placeholders(source) });
    }
  }
});
it('normalizes device language tags and rejects unknown values', () => {
  expect(resolveLanguage('ar-SA')).toBe('ar'); expect(resolveLanguage('EN_gb')).toBe('en');
  expect(resolveLanguage('tr-TR')).toBe('tr'); expect(resolveLanguage(null)).toBeNull(); expect(resolveLanguage('fr')).toBeNull();
});
it('preserves interpolated candidate data without translating or replacing its contents', () => {
  expect(translate('Hazır olduğunuzda başlayalım, {0}.', ['Reading {1} علي'], 'ar')).toBe('لنبدأ عندما تكون جاهزًا، Reading {1} علي.');
  expect(translate('Unknown organisation content', [], 'ar')).toBe('Unknown organisation content');
});
it('translates already-stored local and native errors at display time', () => {
  const source = 'Şifreli fotoğraf kuyruğu: 2 bekleyen. Teslim sunucu onayından sonra tamamlanır.';
  expect(translateMessage(source, 'en')).toContain('2 pending');
  expect(translateMessage(source, 'ar')).toContain('2 صور معلقة');
  expect(translateMessage('Kamera başlatılamadı.', 'en')).toBe('The camera could not start.');
  expect(translateMessage('Kamera başlatılamadı. (HTTP 403)', 'ar')).toBe('تعذر تشغيل الكاميرا. (HTTP 403)');
});
