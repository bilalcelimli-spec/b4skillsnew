/**
 * i18n Engine v2 — 80+ language support with RTL
 * ─────────────────────────────────────────────────────────────────────────────
 * Supports automatic HTML dir/lang attribute management, font-family switching,
 * date/number localisation via Intl API, and lazy-loaded translations.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// ── Language registry ─────────────────────────────────────────────────────────

export interface LangMeta {
  code:    string;  // BCP47
  name:    string;  // native name
  nameEn:  string;  // English name
  dir:     "ltr" | "rtl";
  script:  string;  // ISO 15924
  font?:   string;  // CSS font-family stack for non-Latin scripts
  region?: string;  // flag emoji
}

export const SUPPORTED_LANGUAGES: LangMeta[] = [
  // European LTR
  { code: "en",    name: "English",            nameEn: "English",               dir: "ltr", script: "Latn", region: "🇬🇧" },
  { code: "en-US", name: "English (US)",        nameEn: "English (US)",           dir: "ltr", script: "Latn", region: "🇺🇸" },
  { code: "de",    name: "Deutsch",             nameEn: "German",                dir: "ltr", script: "Latn", region: "🇩🇪" },
  { code: "fr",    name: "Français",            nameEn: "French",                dir: "ltr", script: "Latn", region: "🇫🇷" },
  { code: "es",    name: "Español",             nameEn: "Spanish",               dir: "ltr", script: "Latn", region: "🇪🇸" },
  { code: "es-MX", name: "Español (México)",    nameEn: "Spanish (Mexico)",      dir: "ltr", script: "Latn", region: "🇲🇽" },
  { code: "pt",    name: "Português",           nameEn: "Portuguese",            dir: "ltr", script: "Latn", region: "🇵🇹" },
  { code: "pt-BR", name: "Português (BR)",      nameEn: "Portuguese (BR)",       dir: "ltr", script: "Latn", region: "🇧🇷" },
  { code: "it",    name: "Italiano",            nameEn: "Italian",               dir: "ltr", script: "Latn", region: "🇮🇹" },
  { code: "nl",    name: "Nederlands",          nameEn: "Dutch",                 dir: "ltr", script: "Latn", region: "🇳🇱" },
  { code: "pl",    name: "Polski",              nameEn: "Polish",                dir: "ltr", script: "Latn", region: "🇵🇱" },
  { code: "sv",    name: "Svenska",             nameEn: "Swedish",               dir: "ltr", script: "Latn", region: "🇸🇪" },
  { code: "da",    name: "Dansk",               nameEn: "Danish",                dir: "ltr", script: "Latn", region: "🇩🇰" },
  { code: "nb",    name: "Norsk Bokmål",        nameEn: "Norwegian",             dir: "ltr", script: "Latn", region: "🇳🇴" },
  { code: "fi",    name: "Suomi",               nameEn: "Finnish",               dir: "ltr", script: "Latn", region: "🇫🇮" },
  { code: "cs",    name: "Čeština",             nameEn: "Czech",                 dir: "ltr", script: "Latn", region: "🇨🇿" },
  { code: "sk",    name: "Slovenčina",          nameEn: "Slovak",                dir: "ltr", script: "Latn", region: "🇸🇰" },
  { code: "hu",    name: "Magyar",              nameEn: "Hungarian",             dir: "ltr", script: "Latn", region: "🇭🇺" },
  { code: "ro",    name: "Română",              nameEn: "Romanian",              dir: "ltr", script: "Latn", region: "🇷🇴" },
  { code: "hr",    name: "Hrvatski",            nameEn: "Croatian",              dir: "ltr", script: "Latn", region: "🇭🇷" },
  { code: "bg",    name: "Български",           nameEn: "Bulgarian",             dir: "ltr", script: "Cyrl", font: "Noto Sans", region: "🇧🇬" },
  { code: "uk",    name: "Українська",          nameEn: "Ukrainian",             dir: "ltr", script: "Cyrl", font: "Noto Sans", region: "🇺🇦" },
  { code: "ru",    name: "Русский",             nameEn: "Russian",               dir: "ltr", script: "Cyrl", font: "Noto Sans", region: "🇷🇺" },
  { code: "el",    name: "Ελληνικά",            nameEn: "Greek",                 dir: "ltr", script: "Grek", font: "Noto Sans", region: "🇬🇷" },
  { code: "tr",    name: "Türkçe",              nameEn: "Turkish",               dir: "ltr", script: "Latn", region: "🇹🇷" },
  { code: "et",    name: "Eesti",               nameEn: "Estonian",              dir: "ltr", script: "Latn", region: "🇪🇪" },
  { code: "lv",    name: "Latviešu",            nameEn: "Latvian",               dir: "ltr", script: "Latn", region: "🇱🇻" },
  { code: "lt",    name: "Lietuvių",            nameEn: "Lithuanian",            dir: "ltr", script: "Latn", region: "🇱🇹" },
  { code: "sl",    name: "Slovenščina",         nameEn: "Slovenian",             dir: "ltr", script: "Latn", region: "🇸🇮" },
  { code: "sr",    name: "Српски",              nameEn: "Serbian",               dir: "ltr", script: "Cyrl", font: "Noto Sans", region: "🇷🇸" },
  { code: "ka",    name: "ქართული",             nameEn: "Georgian",              dir: "ltr", script: "Geor", font: '"Noto Sans Georgian", sans-serif', region: "🇬🇪" },
  { code: "hy",    name: "Հայերեն",             nameEn: "Armenian",              dir: "ltr", script: "Armn", font: '"Noto Sans Armenian", sans-serif', region: "🇦🇲" },
  // RTL — Middle East
  { code: "ar",    name: "العربية",             nameEn: "Arabic",                dir: "rtl", script: "Arab", font: '"Noto Sans Arabic","Cairo",sans-serif', region: "🇸🇦" },
  { code: "ar-EG", name: "العربية (مصر)",       nameEn: "Arabic (Egypt)",        dir: "rtl", script: "Arab", font: '"Noto Sans Arabic","Cairo",sans-serif', region: "🇪🇬" },
  { code: "fa",    name: "فارسی",               nameEn: "Persian",               dir: "rtl", script: "Arab", font: '"Noto Sans Arabic",sans-serif', region: "🇮🇷" },
  { code: "he",    name: "עברית",               nameEn: "Hebrew",                dir: "rtl", script: "Hebr", font: '"Noto Sans Hebrew",sans-serif', region: "🇮🇱" },
  { code: "ur",    name: "اردو",                nameEn: "Urdu",                  dir: "rtl", script: "Arab", font: '"Noto Nastaliq Urdu","Noto Sans Arabic",sans-serif', region: "🇵🇰" },
  { code: "ps",    name: "پښتو",                nameEn: "Pashto",                dir: "rtl", script: "Arab", font: '"Noto Sans Arabic",sans-serif', region: "🇦🇫" },
  { code: "ckb",   name: "کوردی",               nameEn: "Kurdish (Sorani)",      dir: "rtl", script: "Arab", font: '"Noto Sans Arabic",sans-serif', region: "🇮🇶" },
  // South / Southeast Asia
  { code: "hi",    name: "हिन्दी",              nameEn: "Hindi",                 dir: "ltr", script: "Deva", font: '"Noto Sans Devanagari",sans-serif', region: "🇮🇳" },
  { code: "bn",    name: "বাংলা",               nameEn: "Bengali",               dir: "ltr", script: "Beng", font: '"Noto Sans Bengali",sans-serif', region: "🇧🇩" },
  { code: "gu",    name: "ગુજરાતી",              nameEn: "Gujarati",              dir: "ltr", script: "Gujr", font: '"Noto Sans Gujarati",sans-serif', region: "🇮🇳" },
  { code: "ta",    name: "தமிழ்",               nameEn: "Tamil",                 dir: "ltr", script: "Taml", font: '"Noto Sans Tamil",sans-serif', region: "🇮🇳" },
  { code: "te",    name: "తెలుగు",              nameEn: "Telugu",                dir: "ltr", script: "Telu", font: '"Noto Sans Telugu",sans-serif', region: "🇮🇳" },
  { code: "kn",    name: "ಕನ್ನಡ",               nameEn: "Kannada",               dir: "ltr", script: "Knda", font: '"Noto Sans Kannada",sans-serif', region: "🇮🇳" },
  { code: "ml",    name: "മലയാളം",             nameEn: "Malayalam",             dir: "ltr", script: "Mlym", font: '"Noto Sans Malayalam",sans-serif', region: "🇮🇳" },
  { code: "mr",    name: "मराठी",               nameEn: "Marathi",               dir: "ltr", script: "Deva", font: '"Noto Sans Devanagari",sans-serif', region: "🇮🇳" },
  { code: "ne",    name: "नेपाली",              nameEn: "Nepali",                dir: "ltr", script: "Deva", font: '"Noto Sans Devanagari",sans-serif', region: "🇳🇵" },
  { code: "si",    name: "සිංහල",               nameEn: "Sinhala",               dir: "ltr", script: "Sinh", font: '"Noto Sans Sinhala",sans-serif', region: "🇱🇰" },
  { code: "th",    name: "ภาษาไทย",             nameEn: "Thai",                  dir: "ltr", script: "Thai", font: '"Noto Sans Thai",sans-serif', region: "🇹🇭" },
  { code: "vi",    name: "Tiếng Việt",          nameEn: "Vietnamese",            dir: "ltr", script: "Latn", region: "🇻🇳" },
  { code: "id",    name: "Bahasa Indonesia",    nameEn: "Indonesian",            dir: "ltr", script: "Latn", region: "🇮🇩" },
  { code: "ms",    name: "Bahasa Melayu",       nameEn: "Malay",                 dir: "ltr", script: "Latn", region: "🇲🇾" },
  { code: "tl",    name: "Filipino",            nameEn: "Filipino",              dir: "ltr", script: "Latn", region: "🇵🇭" },
  { code: "km",    name: "ខ្មែរ",               nameEn: "Khmer",                 dir: "ltr", script: "Khmr", font: '"Noto Sans Khmer",sans-serif', region: "🇰🇭" },
  { code: "my",    name: "မြန်မာ",               nameEn: "Burmese",               dir: "ltr", script: "Mymr", font: '"Noto Sans Myanmar",sans-serif', region: "🇲🇲" },
  // East Asia
  { code: "zh-CN", name: "简体中文",              nameEn: "Chinese (Simplified)",  dir: "ltr", script: "Hans", font: '"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif', region: "🇨🇳" },
  { code: "zh-TW", name: "繁體中文",              nameEn: "Chinese (Traditional)", dir: "ltr", script: "Hant", font: '"Noto Sans CJK TC","PingFang TC",sans-serif', region: "🇹🇼" },
  { code: "ja",    name: "日本語",                nameEn: "Japanese",              dir: "ltr", script: "Jpan", font: '"Noto Sans CJK JP","Yu Gothic","Hiragino Sans",sans-serif', region: "🇯🇵" },
  { code: "ko",    name: "한국어",                nameEn: "Korean",                dir: "ltr", script: "Kore", font: '"Noto Sans CJK KR","Apple SD Gothic Neo",sans-serif', region: "🇰🇷" },
  // Africa
  { code: "sw",    name: "Kiswahili",           nameEn: "Swahili",               dir: "ltr", script: "Latn", region: "🇰🇪" },
  { code: "yo",    name: "Yorùbá",              nameEn: "Yoruba",                dir: "ltr", script: "Latn", region: "🇳🇬" },
  { code: "ha",    name: "Hausa",               nameEn: "Hausa",                 dir: "ltr", script: "Latn", region: "🇳🇬" },
  { code: "am",    name: "አማርኛ",               nameEn: "Amharic",               dir: "ltr", script: "Ethi", font: '"Noto Sans Ethiopic",sans-serif', region: "🇪🇹" },
  { code: "so",    name: "Soomaali",            nameEn: "Somali",                dir: "ltr", script: "Latn", region: "🇸🇴" },
  { code: "af",    name: "Afrikaans",           nameEn: "Afrikaans",             dir: "ltr", script: "Latn", region: "🇿🇦" },
  // Central Asia
  { code: "kk",    name: "Қазақша",             nameEn: "Kazakh",                dir: "ltr", script: "Cyrl", font: "Noto Sans", region: "🇰🇿" },
  { code: "uz",    name: "Oʻzbek",              nameEn: "Uzbek",                 dir: "ltr", script: "Latn", region: "🇺🇿" },
  { code: "ky",    name: "Кыргызча",            nameEn: "Kyrgyz",                dir: "ltr", script: "Cyrl", font: "Noto Sans", region: "🇰🇬" },
  { code: "az",    name: "Azərbaycan",          nameEn: "Azerbaijani",           dir: "ltr", script: "Latn", region: "🇦🇿" },
  { code: "mn",    name: "Монгол",              nameEn: "Mongolian",             dir: "ltr", script: "Cyrl", font: "Noto Sans", region: "🇲🇳" },
  // Americas
  { code: "qu",    name: "Qhichwa",             nameEn: "Quechua",               dir: "ltr", script: "Latn", region: "🇵🇪" },
  { code: "gn",    name: "Avañeʼẽ",            nameEn: "Guaraní",               dir: "ltr", script: "Latn", region: "🇵🇾" },
  // Pacific
  { code: "mi",    name: "Māori",               nameEn: "Māori",                 dir: "ltr", script: "Latn", region: "🇳🇿" },
];

/** BCP47 → LangMeta map */
export const LANG_MAP = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l]));

/** Set of RTL language codes */
export const RTL_LANGS = new Set(
  SUPPORTED_LANGUAGES.filter((l) => l.dir === "rtl").map((l) => l.code)
);

/** Apply lang + dir + font to the HTML document */
export function applyLangMeta(code: string): void {
  const lang = LANG_MAP[code] ?? LANG_MAP["en"];
  const html = document.documentElement;
  html.setAttribute("lang", code);
  html.setAttribute("dir",  lang.dir);
  document.body.style.fontFamily = lang.font ?? "";
}

/** Is the current (or given) language RTL? */
export function isRTL(code?: string): boolean {
  const lang = code
    ?? (typeof document !== "undefined" ? document.documentElement.getAttribute("lang") : null)
    ?? "en";
  return RTL_LANGS.has(lang) || RTL_LANGS.has(lang.split("-")[0]);
}

// ── Intl formatters ───────────────────────────────────────────────────────────

export function formatDate(date: Date | string, lang?: string, opts?: Intl.DateTimeFormatOptions): string {
  const locale = lang ?? i18n.language ?? "en";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", ...opts }).format(new Date(date));
}

export function formatNumber(n: number, lang?: string, opts?: Intl.NumberFormatOptions): string {
  const locale = lang ?? i18n.language ?? "en";
  return new Intl.NumberFormat(locale, opts).format(n);
}

export function formatCurrency(amount: number, currency = "USD", lang?: string): string {
  const locale = lang ?? i18n.language ?? "en";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

// ── Translation resources ─────────────────────────────────────────────────────


const resources = {
  en: {
    translation: {
      "common.welcome": "Welcome to LinguAdapt",
      "common.start_test": "Start Assessment",
      "common.results": "Your Results",
      "common.loading": "Loading...",
      "common.cancel": "Cancel",
      "common.save": "Save",
      "common.back": "Back",
      "common.continue": "Continue",
      "common.close": "Close",
      "common.error": "An error occurred",
      "common.success": "Success",
      "common.confirm": "Confirm",
      "admin.dashboard": "Admin Dashboard",
      "admin.candidates": "Candidates",
      "admin.analytics": "Analytics",
      "admin.settings": "Settings",
      "admin.item_bank": "Item Bank",
      "admin.psychometrics": "Psychometrics",
      "admin.operations": "Operations",
      "admin.overview": "Overview",
      "test.next": "Next Task",
      "test.submit": "Submit Response",
      "test.time_left": "Time Left",
      "test.listening": "Listening Task",
      "test.writing": "Write your response",
      "test.speaking": "Record your response",
      "test.recording": "Recording...",
      "test.play_audio": "Play audio",
      "auth.login": "Sign In",
      "auth.logout": "Sign Out",
      "auth.email": "Email address",
      "auth.password": "Password",
      "auth.register": "Create account",
      "auth.forgot_password": "Forgot password?",
      "results.your_level": "Your English Level",
      "results.download_certificate": "Download Certificate",
      "results.share": "Share Results",
      "cefr.pre_a1": "Beginner",
      "cefr.a1": "Elementary",
      "cefr.a2": "Pre-Intermediate",
      "cefr.b1": "Intermediate",
      "cefr.b2": "Upper Intermediate",
      "cefr.c1": "Advanced",
      "cefr.c2": "Proficient"
    }
  },
  tr: {
    translation: {
      "common.welcome": "b4skills'e Hoş Geldiniz",
      "common.start_test": "Değerlendirmeye Başla",
      "common.results": "Sonuçlarınız",
      "common.loading": "Yükleniyor...",
      "common.cancel": "İptal",
      "common.save": "Kaydet",
      "common.back": "Geri",
      "common.continue": "Devam Et",
      "common.close": "Kapat",
      "common.error": "Bir hata oluştu",
      "common.success": "Başarılı",
      "common.confirm": "Onayla",
      "admin.dashboard": "Yönetici Paneli",
      "admin.candidates": "Adaylar",
      "admin.analytics": "Analizler",
      "admin.settings": "Ayarlar",
      "admin.item_bank": "Soru Bankası",
      "admin.psychometrics": "Psikometri",
      "admin.operations": "Operasyonlar",
      "admin.overview": "Genel Bakış",
      "test.next": "Sonraki Görev",
      "test.submit": "Yanıtı Gönder",
      "test.time_left": "Kalan Süre",
      "test.listening": "Dinleme Görevi",
      "test.writing": "Yanıtınızı yazın",
      "test.speaking": "Yanıtınızı kaydedin",
      "test.recording": "Kaydediliyor...",
      "test.play_audio": "Sesi oynat",
      "auth.login": "Giriş Yap",
      "auth.logout": "Çıkış Yap",
      "auth.email": "E-posta adresi",
      "auth.password": "Şifre",
      "auth.register": "Hesap oluştur",
      "auth.forgot_password": "Şifremi unuttum",
      "results.your_level": "İngilizce Seviyeniz",
      "results.download_certificate": "Sertifika İndir",
      "results.share": "Sonuçları Paylaş",
      "cefr.pre_a1": "Başlangıç",
      "cefr.a1": "Temel",
      "cefr.a2": "Başlangıç-Orta",
      "cefr.b1": "Orta",
      "cefr.b2": "Orta-Üst",
      "cefr.c1": "İleri",
      "cefr.c2": "Yetkin"
    }
  },
  es: {
    translation: {
      "common.welcome": "Bienvenido a b4skills",
      "common.start_test": "Iniciar Evaluación",
      "common.results": "Tus Resultados",
      "common.loading": "Cargando...",
      "common.cancel": "Cancelar",
      "common.save": "Guardar",
      "common.back": "Atrás",
      "common.continue": "Continuar",
      "common.close": "Cerrar",
      "common.error": "Ocurrió un error",
      "common.success": "Éxito",
      "common.confirm": "Confirmar",
      "admin.dashboard": "Panel de Administración",
      "admin.candidates": "Candidatos",
      "admin.analytics": "Analítica",
      "admin.settings": "Configuración",
      "admin.item_bank": "Banco de ítems",
      "admin.psychometrics": "Psicometría",
      "admin.operations": "Operaciones",
      "admin.overview": "Vista general",
      "test.next": "Siguiente Tarea",
      "test.submit": "Enviar Respuesta",
      "test.time_left": "Tiempo Restante",
      "test.listening": "Tarea de Escucha",
      "test.writing": "Escribe tu respuesta",
      "test.speaking": "Graba tu respuesta",
      "test.recording": "Grabando...",
      "test.play_audio": "Reproducir audio",
      "auth.login": "Iniciar sesión",
      "auth.logout": "Cerrar sesión",
      "auth.email": "Correo electrónico",
      "auth.password": "Contraseña",
      "auth.register": "Crear cuenta",
      "auth.forgot_password": "¿Olvidó su contraseña?",
      "results.your_level": "Tu Nivel de Inglés",
      "results.download_certificate": "Descargar Certificado",
      "results.share": "Compartir Resultados",
      "cefr.pre_a1": "Principiante",
      "cefr.a1": "Elemental",
      "cefr.a2": "Pre-Intermedio",
      "cefr.b1": "Intermedio",
      "cefr.b2": "Intermedio Alto",
      "cefr.c1": "Avanzado",
      "cefr.c2": "Competente"
    }
  },
  fr: {
    translation: {
      "common.welcome": "Bienvenue sur b4skills",
      "common.start_test": "Commencer l'évaluation",
      "common.results": "Vos résultats",
      "common.loading": "Chargement...",
      "common.cancel": "Annuler",
      "common.save": "Enregistrer",
      "common.back": "Retour",
      "common.continue": "Continuer",
      "common.close": "Fermer",
      "common.error": "Une erreur s'est produite",
      "common.success": "Succès",
      "common.confirm": "Confirmer",
      "admin.dashboard": "Tableau de bord",
      "admin.candidates": "Candidats",
      "admin.analytics": "Analytique",
      "admin.settings": "Paramètres",
      "admin.item_bank": "Banque d'items",
      "admin.psychometrics": "Psychométrie",
      "admin.operations": "Opérations",
      "admin.overview": "Vue d'ensemble",
      "test.next": "Tâche suivante",
      "test.submit": "Soumettre la réponse",
      "test.time_left": "Temps restant",
      "test.listening": "Tâche d'écoute",
      "test.writing": "Écrivez votre réponse",
      "test.speaking": "Enregistrez votre réponse",
      "test.recording": "Enregistrement...",
      "test.play_audio": "Lire l'audio",
      "auth.login": "Se connecter",
      "auth.logout": "Se déconnecter",
      "auth.email": "Adresse e-mail",
      "auth.password": "Mot de passe",
      "auth.register": "Créer un compte",
      "auth.forgot_password": "Mot de passe oublié ?",
      "results.your_level": "Votre niveau d'anglais",
      "results.download_certificate": "Télécharger le certificat",
      "results.share": "Partager les résultats",
      "cefr.pre_a1": "Débutant",
      "cefr.a1": "Élémentaire",
      "cefr.a2": "Pré-intermédiaire",
      "cefr.b1": "Intermédiaire",
      "cefr.b2": "Intermédiaire supérieur",
      "cefr.c1": "Avancé",
      "cefr.c2": "Maîtrise"
    }
  },
  ar: {
    translation: {
      "common.welcome": "مرحباً بكم في LinguAdapt",
      "common.start_test": "بدء التقييم",
      "common.results": "نتائجك",
      "common.loading": "جارٍ التحميل...",
      "common.cancel": "إلغاء",
      "common.save": "حفظ",
      "common.back": "رجوع",
      "common.continue": "متابعة",
      "common.close": "إغلاق",
      "common.error": "حدث خطأ ما",
      "common.success": "نجاح",
      "common.confirm": "تأكيد",
      "admin.dashboard": "لوحة التحكم",
      "admin.candidates": "المرشحون",
      "admin.analytics": "التحليلات",
      "admin.settings": "الإعدادات",
      "admin.item_bank": "بنك الأسئلة",
      "admin.psychometrics": "القياس النفسي",
      "admin.operations": "العمليات",
      "admin.overview": "نظرة عامة",
      "test.next": "المهمة التالية",
      "test.submit": "إرسال الإجابة",
      "test.time_left": "الوقت المتبقي",
      "test.listening": "مهمة الاستماع",
      "test.writing": "اكتب إجابتك",
      "test.speaking": "سجّل إجابتك",
      "test.recording": "جارٍ التسجيل...",
      "test.play_audio": "تشغيل الصوت",
      "auth.login": "تسجيل الدخول",
      "auth.logout": "تسجيل الخروج",
      "auth.email": "البريد الإلكتروني",
      "auth.password": "كلمة المرور",
      "auth.register": "إنشاء حساب",
      "auth.forgot_password": "نسيت كلمة المرور؟",
      "results.your_level": "مستوى اللغة الإنجليزية",
      "results.download_certificate": "تحميل الشهادة",
      "results.share": "مشاركة النتائج",
      "cefr.pre_a1": "مبتدئ",
      "cefr.a1": "أساسي",
      "cefr.a2": "ما قبل المتوسط",
      "cefr.b1": "متوسط",
      "cefr.b2": "فوق المتوسط",
      "cefr.c1": "متقدم",
      "cefr.c2": "محترف"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "la-lang",
    },
    react: { useSuspense: false },
  })
  .then(() => {
    // Sync DOM attributes on startup
    if (typeof document !== "undefined") applyLangMeta(i18n.language);
    i18n.on("languageChanged", (code) => {
      if (typeof document !== "undefined") applyLangMeta(code);
    });
  });

export default i18n;
