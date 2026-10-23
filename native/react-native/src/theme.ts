// B4Skills brand tokens. Sources: src/components/SiteNav.tsx (plum wordmark, -6° skew),
// src/components/LandingPage.tsx (#9B276C / #7D1F57), src/App.tsx (#0F172A, #FDE047),
// public/favicon.svg. The older LinguAdapt blue tokens are intentionally not used.
import { Platform } from 'react-native';

export const color = {
  plum: '#9B276C',
  plumDark: '#7D1F57',
  plumSoft: '#B84D8C',
  navy: '#0F172A',
  navyRaised: '#172036',
  // Signed-out screens: the deep violet at the right end of public/b4skillslogo.png's gradient,
  // with the logo's magenta as the halo, so the badge reads as part of the page.
  aubergine: '#1E0820',
  aubergineRaised: '#33102F',
  logoMagenta: '#C8246E',
  gold: '#FDE047',
  ink: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  faint: '#94A3B8',
  canvas: '#F8F7FA',
  surface: '#FFFFFF',
  line: '#E9E4EC',
  wash: '#F6EBF2',
  success: '#15803D',
  successWash: '#ECFDF3',
  warning: '#92400E',
  warningWash: '#FFF7E6',
  danger: '#B91C1C',
  dangerWash: '#FEF2F2',
  onDark: '#FFFFFF',
  onDarkMuted: 'rgba(255,255,255,0.55)',
  onDarkFaint: 'rgba(255,255,255,0.10)',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// System font is SF on Apple platforms, the closest native match to the web's Inter.
// Georgia stands in for the web's Lora editorial serif.
export const font = {
  serif: Platform.select({ default: 'Georgia' }),
  mono: Platform.select({ ios: 'Menlo', macos: 'Menlo', default: 'monospace' }),
};

export const type = {
  display: { fontSize: 44, fontWeight: '700' as const, letterSpacing: -1.6, lineHeight: 50 },
  title: { fontSize: 32, fontWeight: '600' as const, letterSpacing: -1, lineHeight: 38 },
  heading: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.4, lineHeight: 28 },
  body: { fontSize: 15, lineHeight: 23 },
  small: { fontSize: 13, lineHeight: 19 },
  caption: { fontSize: 11, lineHeight: 15 },
  eyebrow: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 2 },
};

export const shadow = {
  card: {
    shadowColor: color.navy,
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
};

export const SKILLS: Record<string, { label: string; hint: string; icon: IconName }> = {
  READING: { label: 'Reading', hint: 'Anlayın ve yorumlayın', icon: 'book' },
  LISTENING: { label: 'Listening', hint: 'Dinleyin ve keşfedin', icon: 'headphones' },
  WRITING: { label: 'Writing', hint: 'Düşüncelerinizi aktarın', icon: 'pen' },
  SPEAKING: { label: 'Speaking', hint: 'Kendinizi ifade edin', icon: 'waveform' },
  GRAMMAR: { label: 'Grammar', hint: 'Yapıları doğru kullanın', icon: 'text' },
  VOCABULARY: { label: 'Vocabulary', hint: 'Kelimelerle çalışın', icon: 'spell' },
};

export function skillMeta(skill: string) {
  const key = skill.toUpperCase();
  return SKILLS[key] ?? { label: key.charAt(0) + key.slice(1).toLowerCase(), hint: '', icon: 'grid' as IconName };
}

export type IconName =
  | 'arrowRight' | 'check' | 'checkCircle' | 'book' | 'headphones' | 'pen' | 'mic' | 'waveform'
  | 'mail' | 'lock' | 'shield' | 'help' | 'sliders' | 'logout' | 'play' | 'pause' | 'stop'
  | 'refresh' | 'sidebar' | 'grid' | 'layers' | 'sparkle' | 'alert' | 'info' | 'user' | 'hash'
  | 'globe' | 'text' | 'spell' | 'close' | 'clock' | 'chevronRight' | 'chevronLeft' | 'target' | 'hand';
