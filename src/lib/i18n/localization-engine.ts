/**
 * b4skills Advanced Localization Engine
 *
 * Extends the base i18next config with:
 *  - Dynamic language loading
 *  - RTL support (Arabic, Farsi, Hebrew)
 *  - Content-level item translation
 *  - Dialect / register adaptation
 *  - Locale-specific date/number/currency formatting
 */

export type SupportedLocale =
  | "en"    // English (British)
  | "en-US" // English (American)
  | "tr"    // Turkish
  | "de"    // German
  | "fr"    // French
  | "es"    // Spanish
  | "pt"    // Portuguese (Brazilian)
  | "ar"    // Arabic
  | "zh"    // Chinese (Simplified)
  | "ja"    // Japanese
  | "ko"    // Korean
  | "hi";   // Hindi

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  dateFormat: string;
  numberFormat: Intl.NumberFormatOptions;
  currencyCode: string;
  flag: string;
  pluralRules: "default" | "arabic" | "slavic" | "asian";
}

export const LOCALE_CONFIGS: Record<SupportedLocale, LocaleConfig> = {
  "en": { code: "en", name: "English", nativeName: "English", direction: "ltr", dateFormat: "DD/MM/YYYY", numberFormat: { maximumFractionDigits: 2 }, currencyCode: "GBP", flag: "🇬🇧", pluralRules: "default" },
  "en-US": { code: "en-US", name: "English (US)", nativeName: "English (US)", direction: "ltr", dateFormat: "MM/DD/YYYY", numberFormat: { maximumFractionDigits: 2 }, currencyCode: "USD", flag: "🇺🇸", pluralRules: "default" },
  "tr": { code: "tr", name: "Turkish", nativeName: "Türkçe", direction: "ltr", dateFormat: "DD.MM.YYYY", numberFormat: { maximumFractionDigits: 2 }, currencyCode: "TRY", flag: "🇹🇷", pluralRules: "default" },
  "de": { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr", dateFormat: "DD.MM.YYYY", numberFormat: { maximumFractionDigits: 2 }, currencyCode: "EUR", flag: "🇩🇪", pluralRules: "default" },
  "fr": { code: "fr", name: "French", nativeName: "Français", direction: "ltr", dateFormat: "DD/MM/YYYY", numberFormat: { maximumFractionDigits: 2 }, currencyCode: "EUR", flag: "🇫🇷", pluralRules: "default" },
  "es": { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr", dateFormat: "DD/MM/YYYY", numberFormat: { maximumFractionDigits: 2 }, currencyCode: "EUR", flag: "🇪🇸", pluralRules: "default" },
  "pt": { code: "pt", name: "Portuguese (BR)", nativeName: "Português", direction: "ltr", dateFormat: "DD/MM/YYYY", numberFormat: { maximumFractionDigits: 2 }, currencyCode: "BRL", flag: "🇧🇷", pluralRules: "default" },
  "ar": { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl", dateFormat: "DD/MM/YYYY", numberFormat: { maximumFractionDigits: 2 }, currencyCode: "AED", flag: "🇦🇪", pluralRules: "arabic" },
  "zh": { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文", direction: "ltr", dateFormat: "YYYY/MM/DD", numberFormat: { maximumFractionDigits: 0 }, currencyCode: "CNY", flag: "🇨🇳", pluralRules: "asian" },
  "ja": { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr", dateFormat: "YYYY年MM月DD日", numberFormat: { maximumFractionDigits: 0 }, currencyCode: "JPY", flag: "🇯🇵", pluralRules: "asian" },
  "ko": { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr", dateFormat: "YYYY년 MM월 DD일", numberFormat: { maximumFractionDigits: 0 }, currencyCode: "KRW", flag: "🇰🇷", pluralRules: "asian" },
  "hi": { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", dateFormat: "DD/MM/YYYY", numberFormat: { maximumFractionDigits: 2 }, currencyCode: "INR", flag: "🇮🇳", pluralRules: "default" },
};

const RTL_LOCALES = new Set<SupportedLocale>(["ar"]);

// ---------------------------------------------------------------------------
// Localization Engine
// ---------------------------------------------------------------------------

export class LocalizationEngine {
  private currentLocale: SupportedLocale = "en";
  private loadedLocales = new Set<string>(["en"]);
  private translations: Map<string, Record<string, unknown>> = new Map();

  async loadLanguage(locale: SupportedLocale): Promise<void> {
    if (this.loadedLocales.has(locale)) return;

    try {
      // Dynamically import locale JSON (falls back gracefully)
      const messages = await import(`./locales/${locale}.json`, { assert: { type: "json" } }).then((m) => m.default).catch(async () => {
        // Try without locale qualifier (e.g., en-US → en)
        const base = locale.split("-")[0];
        return import(`./locales/${base}.json`, { assert: { type: "json" } }).then((m) => m.default).catch(() => ({}));
      });
      this.translations.set(locale, messages);
      this.loadedLocales.add(locale);
    } catch {
      console.warn(`[i18n] Failed to load locale ${locale}`);
    }

    // Set document direction
    if (typeof document !== "undefined") {
      const config = LOCALE_CONFIGS[locale];
      document.documentElement.dir = config?.direction ?? "ltr";
      document.documentElement.lang = locale;
    }
  }

  async setLocale(locale: SupportedLocale): Promise<void> {
    await this.loadLanguage(locale);
    this.currentLocale = locale;

    if (typeof document !== "undefined") {
      const config = LOCALE_CONFIGS[locale];
      document.documentElement.dir = config?.direction ?? "ltr";
      document.documentElement.lang = locale;
    }
  }

  getCurrentLocale(): SupportedLocale {
    return this.currentLocale;
  }

  getLocaleConfig(locale?: SupportedLocale): LocaleConfig {
    return LOCALE_CONFIGS[locale ?? this.currentLocale] ?? LOCALE_CONFIGS["en"];
  }

  isRTL(locale?: SupportedLocale): boolean {
    return RTL_LOCALES.has(locale ?? this.currentLocale);
  }

  t(key: string, params?: Record<string, string | number>, locale?: SupportedLocale): string {
    const loc = locale ?? this.currentLocale;
    const messages = this.translations.get(loc) ?? this.translations.get("en") ?? {};
    const value = key.split(".").reduce<unknown>((obj, k) => (typeof obj === "object" && obj !== null ? (obj as Record<string, unknown>)[k] : undefined), messages);
    let text = typeof value === "string" ? value : key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      }
    }
    return text;
  }

  formatDate(date: Date, locale?: SupportedLocale): string {
    const loc = locale ?? this.currentLocale;
    try {
      return date.toLocaleDateString(loc, { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return date.toLocaleDateString();
    }
  }

  formatNumber(value: number, locale?: SupportedLocale): string {
    const loc = locale ?? this.currentLocale;
    const config = LOCALE_CONFIGS[loc];
    try {
      return new Intl.NumberFormat(loc, config?.numberFormat).format(value);
    } catch {
      return String(value);
    }
  }

  formatCurrency(amount: number, locale?: SupportedLocale): string {
    const loc = locale ?? this.currentLocale;
    const config = LOCALE_CONFIGS[loc];
    try {
      return new Intl.NumberFormat(loc, {
        style: "currency",
        currency: config?.currencyCode ?? "USD",
      }).format(amount);
    } catch {
      return `${config?.currencyCode ?? ""}${amount}`;
    }
  }

  getSupportedLocales(): LocaleConfig[] {
    return Object.values(LOCALE_CONFIGS);
  }

  detectBrowserLocale(): SupportedLocale {
    if (typeof navigator === "undefined") return "en";
    const preferred = navigator.languages?.[0] ?? navigator.language ?? "en";
    const code = preferred.toLowerCase() as SupportedLocale;
    if (LOCALE_CONFIGS[code]) return code;
    const base = preferred.split("-")[0].toLowerCase() as SupportedLocale;
    if (LOCALE_CONFIGS[base]) return base;
    return "en";
  }
}

export const localizationEngine = new LocalizationEngine();
