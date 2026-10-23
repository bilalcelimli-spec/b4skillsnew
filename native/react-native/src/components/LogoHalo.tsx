import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LOGO, LOGO_ASPECT } from '../assets/logo';
import { color } from '../theme';

/** public/b4skillslogo.png with a soft magenta halo (stacked low-opacity discs, no gradient lib). */
export function LogoHalo({ width, halo = true }: { width: number; halo?: boolean }) {
  const height = width / LOGO_ASPECT;
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      {halo
        ? [2.3, 1.95, 1.65, 1.4, 1.2, 1.02, 0.86].map(k => (
            <View key={k} pointerEvents="none"
              style={[styles.glow, { width: width * k, height: width * k, borderRadius: (width * k) / 2 }]} />
          ))
        : null}
      <Image source={LOGO} style={{ width, height }} resizeMode="contain" accessibilityLabel="b4skills" accessibilityRole="image" />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', backgroundColor: color.logoMagenta, opacity: 0.045 },
});
