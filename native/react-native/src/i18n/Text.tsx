import React from 'react';
import { StyleSheet, Text as NativeText, TextProps } from 'react-native';
import { localeTags } from './core';
import { useLanguage } from './store';

type Props = TextProps & { direction?: 'ltr' | 'rtl' };
export const Text = React.forwardRef<React.ComponentRef<typeof NativeText>, Props>(function Text({ direction, style, ...props }, ref) {
  const { rtl, language } = useLanguage();
  const textDirection = direction ?? (rtl ? 'rtl' : 'ltr');
  const arabic = textDirection === 'rtl';
  const flattened = StyleSheet.flatten(style) ?? {};
  return <NativeText ref={ref} {...props} accessibilityLanguage={direction === 'ltr' ? 'en' : localeTags[language]}
    style={[{ textAlign: arabic ? 'right' : 'left' }, style, { direction: "ltr", writingDirection: textDirection }, arabic && {
      letterSpacing: 0, fontFamily: undefined,
      lineHeight: Math.max(flattened.lineHeight ?? 0, Math.ceil((flattened.fontSize ?? 14) * 1.45)),
    }]} />;
});
