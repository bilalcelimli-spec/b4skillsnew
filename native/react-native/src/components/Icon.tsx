import { useLanguage } from '../i18n/store';
import React from 'react';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { IconName } from '../theme';

// Stroke icons on a 24×24 grid (lucide-style), drawn natively on iPadOS and macOS.
type Glyph = { d?: string[]; c?: [number, number, number][]; fill?: boolean };

const GLYPHS: Record<IconName, Glyph> = {
  arrowRight: { d: ['M5 12h14', 'm12 5 7 7-7 7'] },
  check: { d: ['M20 6 9 17l-5-5'] },
  checkCircle: { c: [[12, 12, 10]], d: ['m8.5 12 2.5 2.5 5-5'] },
  book: { d: ['M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z', 'M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z'] },
  headphones: { d: ['M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3'] },
  pen: { d: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'] },
  mic: { d: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'] },
  waveform: { d: ['M2 10v3', 'M6 6v11', 'M10 3v18', 'M14 8v7', 'M18 5v13', 'M22 10v3'] },
  mail: { d: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'm22 6-10 7L2 6'] },
  lock: { d: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'] },
  shield: { d: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10', 'm9 12 2 2 4-4'] },
  help: { c: [[12, 12, 10]], d: ['M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3', 'M12 17h.01'] },
  sliders: { d: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'] },
  logout: { d: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'] },
  play: { d: ['M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z'], fill: true },
  pause: { d: ['M6 4h4v16H6z', 'M14 4h4v16h-4z'], fill: true },
  stop: { d: ['M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'], fill: true },
  refresh: { d: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'] },
  sidebar: { d: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M9 3v18'] },
  grid: { d: ['M4 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M15 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M15 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z', 'M4 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z'] },
  layers: { d: ['m12 2 10 5-10 5L2 7z', 'm2 17 10 5 10-5', 'm2 12 10 5 10-5'] },
  sparkle: { d: ['M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z'] },
  alert: { d: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'] },
  info: { c: [[12, 12, 10]], d: ['M12 16v-4', 'M12 8h.01'] },
  user: { c: [[12, 7, 4]], d: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'] },
  hash: { d: ['M4 9h16', 'M4 15h16', 'M10 3 8 21', 'M16 3l-2 18'] },
  globe: { c: [[12, 12, 10]], d: ['M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'] },
  text: { d: ['M17 6H3', 'M21 12H3', 'M15 18H3'] },
  spell: { d: ['m4 16 5-11 5 11', 'M6 12h6', 'm15 19 2 2 4-4'] },
  close: { d: ['M18 6 6 18', 'm6 6 12 12'] },
  clock: { c: [[12, 12, 10]], d: ['M12 6v6l4 2'] },
  chevronRight: { d: ['m9 18 6-6-6-6'] },
  chevronLeft: { d: ['m15 18-6-6 6-6'] },
  target: { c: [[12, 12, 10], [12, 12, 6], [12, 12, 2]] },
  hand: { d: ['M18 11V6a2 2 0 0 0-4 0v5', 'M14 10V4a2 2 0 0 0-4 0v6', 'M10 10.5V6a2 2 0 0 0-4 0v8', 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15'] },
};

export function Icon({ name, size = 20, color = '#0F172A', strokeWidth = 1.9 }: {
  name: IconName; size?: number; color?: string; strokeWidth?: number;
}) {
  const { rtl } = useLanguage();
  const mirror = rtl && ['arrowRight', 'chevronRight', 'chevronLeft', 'sidebar', 'logout'].includes(name);
  const glyph = GLYPHS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <G transform={mirror ? "translate(24, 0) scale(-1, 1)" : undefined}>
      {glyph.c?.map(([cx, cy, r], i) => (
        <Circle key={`c${i}`} cx={cx} cy={cy} r={r} stroke={color} strokeWidth={strokeWidth} fill="none" />
      ))}
      {glyph.d?.map((d, i) => (
        <Path
          key={`p${i}`}
          d={d}
          stroke={glyph.fill ? 'none' : color}
          fill={glyph.fill ? color : 'none'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      </G>
    </Svg>
  );
}
