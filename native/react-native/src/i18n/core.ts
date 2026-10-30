import catalogue from './messages.json';

export type Language = 'tr' | 'en' | 'ar';
export const languages: readonly Language[] = ['tr', 'en', 'ar'];
export const languageNames: Record<Language, string> = { tr: 'Türkçe', en: 'English', ar: 'العربية' };
export const localeTags: Record<Language, string> = { tr: 'tr-TR', en: 'en-US', ar: 'ar' };
export const messages: Record<string, { en: string; ar: string }> = catalogue;
export function resolveLanguage(value: unknown): Language | null {
  if (typeof value !== 'string') return null;
  const base = value.toLowerCase().split(/[-_]/)[0];
  return languages.includes(base as Language) ? base as Language : null;
}
let current: Language = 'tr';
export const getLanguage = () => current;
export function commitLanguage(language: Language) { current = language; }

/** UI copy only. Never pass questions, choices, answers or candidate names here. */
export function translate(source: string, values: readonly unknown[] = [], language = current): string {
  const key = source.trim();
  const template = language === 'tr' ? key : messages[key]?.[language] ?? key;
  const prefix = source.startsWith(' ') ? ' ' : '', suffix = source.endsWith(' ') ? ' ' : '';
  return prefix + template.replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? `{${index}}`)) + suffix;
}
export const t = translate;

// Local hooks and the native bridge retain source-language messages in state. Translate at
// presentation time so changing the UI language also updates an already visible notice.
const patterns = Object.keys(messages).filter(key => /\{\d+\}/.test(key)).map(key => {
  const indices: number[] = [];
  const escaped = key.split(/(\{\d+\})/).map(part => {
    if (/^\{\d+\}$/.test(part)) { indices.push(Number(part.slice(1, -1))); return '([\\s\\S]*?)'; }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return { key, indices, match: new RegExp('^' + escaped + '$') };
});
export function translateMessage(source: string, language = current): string {
  if (language === 'tr') return source;
  if (messages[source.trim()]) return translate(source, [], language);
  for (const pattern of patterns) {
    const matched = pattern.match.exec(source.trim());
    if (!matched) continue;
    const values: string[] = [];
    pattern.indices.forEach((index, i) => { values[index] = matched[i + 1]; });
    if (pattern.key === '{0} (HTTP {1})') values[0] = translateMessage(values[0], language);
    return translate(pattern.key, values, language);
  }
  return source;
}
