import React, { ReactNode, useState } from 'react';
import {
  ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput,
  TextInputProps, View, ViewStyle,
} from 'react-native';
import { color, IconName, radius, shadow, type } from '../theme';
import { Icon } from './Icon';
import { LOGO, LOGO_ASPECT } from '../assets/logo';

/** The real b4skills logo (public/b4skillslogo.png). Height in points; width follows its aspect. */
export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const height = size === 'sm' ? 30 : size === 'lg' ? 64 : 42;
  return (
    <Image
      source={LOGO}
      style={{ height, width: height * LOGO_ASPECT, marginLeft: -height * 0.04 }}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="b4skills"
    />
  );
}

/** The favicon mark: white "b4" on a plum rounded square. */
export function Monogram({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.monogram, { width: size, height: size, borderRadius: size * 0.19 }]}>
      <Text style={[styles.monogramText, { fontSize: size * 0.42 }]}>b4</Text>
    </View>
  );
}

export function Eyebrow({ children, tone = color.plum }: { children: string; tone?: string }) {
  return <Text style={[type.eyebrow, { color: tone }]}>{children.toLocaleUpperCase('tr-TR')}</Text>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  trailingIcon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'onDark';
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label, onPress, icon, trailingIcon, variant = 'primary', disabled, loading, block, compact, accessibilityHint, style,
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  const onDark = variant === 'onDark';
  const fg = primary ? color.onDark : danger ? color.danger : variant === 'ghost' ? color.muted : onDark ? 'rgba(255,255,255,0.78)' : color.plum;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        block && styles.block,
        primary && { backgroundColor: pressed || hovered ? color.plumDark : color.plum },
        variant === 'secondary' && [styles.secondary, (pressed || hovered) && { backgroundColor: color.wash }],
        variant === 'ghost' && (pressed || hovered) && { backgroundColor: 'rgba(15,23,42,0.05)' },
        onDark && (pressed || hovered) && { backgroundColor: 'rgba(255,255,255,0.08)' },
        danger && [styles.secondary, { borderColor: '#F3D2D2' }, (pressed || hovered) && { backgroundColor: color.dangerWash }],
        (disabled || loading) && { opacity: 0.5 },
        pointer,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon ? <Icon name={icon} size={17} color={fg} /> : null}
      <Text style={[styles.buttonText, compact && { fontSize: 13 }, { color: fg }, block && !trailingIcon && { flex: 0 }]} numberOfLines={1}>
        {label}
      </Text>
      {trailingIcon ? (
        <>
          {block ? <View style={{ flex: 1 }} /> : null}
          <Icon name={trailingIcon} size={17} color={fg} />
        </>
      ) : null}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, tone = color.muted, size = 20 }: {
  icon: IconName; label: string; onPress: () => void; tone?: string; size?: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, (pressed || hovered) && { backgroundColor: 'rgba(15,23,42,0.06)' }, pointer]}
    >
      <Icon name={icon} size={size} color={tone} />
    </Pressable>
  );
}

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[styles.card, padded && { padding: 28 }, style]}>{children}</View>;
}

export const Field = React.forwardRef<TextInput, TextInputProps & { label: string; icon: IconName }>(function Field(
  { label, icon, ...input }, ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <Icon name={icon} size={16} color={focused ? color.plum : color.faint} />
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={color.faint}
          autoCorrect={false}
          autoCapitalize="none"
          {...input}
          onFocus={e => { setFocused(true); input.onFocus?.(e); }}
          onBlur={e => { setFocused(false); input.onBlur?.(e); }}
          style={[styles.input, input.style]}
        />
      </View>
    </View>
  );
});

export function Message({ text, tone = 'info', onDismiss }: { text: string; tone?: 'info' | 'error' | 'success'; onDismiss?: () => void }) {
  const palette = tone === 'error'
    ? { fg: color.danger, bg: color.dangerWash, icon: 'alert' as const }
    : tone === 'success'
      ? { fg: color.success, bg: color.successWash, icon: 'checkCircle' as const }
      : { fg: color.plum, bg: color.wash, icon: 'info' as const };
  return (
    <View accessibilityRole="alert" style={[styles.message, { backgroundColor: palette.bg }]}>
      <Icon name={palette.icon} size={18} color={palette.fg} />
      <Text style={[type.small, { color: palette.fg, flex: 1 }]}>{text}</Text>
      {onDismiss ? <IconButton icon="close" label="Kapat" onPress={onDismiss} tone={palette.fg} size={16} /> : null}
    </View>
  );
}

export function SkillTile({ title, subtitle, icon, style }: { title: string; subtitle: string; icon: IconName; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tile, style]} accessible accessibilityLabel={`${title}. ${subtitle}`}>
      <View style={styles.tileIcon}><Icon name={icon} size={22} color={color.plum} /></View>
      <View style={{ gap: 4 }}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={[type.small, { color: color.muted }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

export function ProgressBar({ value, tone = color.plum, track = color.wash, height = 6 }: { value: number; tone?: string; track?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: tone }} />
    </View>
  );
}

export function Sheet({ visible, onClose, title, eyebrow, children }: {
  visible: boolean; onClose: () => void; title: string; eyebrow?: string; children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Kapat" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, gap: 8 }}>
              {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
              <Text style={[type.heading, { color: color.ink }]}>{title}</Text>
            </View>
            <IconButton icon="close" label="Kapat" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 28, paddingTop: 4, gap: 18 }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const pointer = Platform.OS === 'ios' || Platform.OS === 'macos' ? ({ cursor: 'pointer' } as ViewStyle) : null;

const styles = StyleSheet.create({
  monogram: { backgroundColor: color.plum, alignItems: 'center', justifyContent: 'center' },
  monogramText: {
    color: color.onDark, fontWeight: '900', letterSpacing: -0.6,
    textShadowColor: 'rgba(253,224,71,0.8)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 0 },
  },
  button: {
    minHeight: 50, paddingHorizontal: 20, borderRadius: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, alignSelf: 'flex-start',
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: 14, borderRadius: 11 },
  block: { alignSelf: 'stretch' },
  secondary: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  buttonText: { fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  iconButton: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.line, ...shadow.card },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: color.ink },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14,
    backgroundColor: color.canvas, borderRadius: radius.md, borderWidth: 1, borderColor: color.line,
  },
  fieldFocused: { borderColor: color.plum, backgroundColor: color.surface },
  // letterSpacing is explicit: recycled native inputs can otherwise keep the code box's tracking.
  input: { flex: 1, fontSize: 15, color: color.ink, paddingVertical: 12, letterSpacing: 0, textAlign: 'left' },
  message: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg },
  tile: {
    flexGrow: 1, flexBasis: 200, minHeight: 132, padding: 20, gap: 16, backgroundColor: color.surface,
    borderRadius: 20, borderWidth: 1, borderColor: color.line,
  },
  tileIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 16, fontWeight: '600', color: color.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: {
    width: '100%', maxWidth: 520, maxHeight: '88%', backgroundColor: color.canvas, borderRadius: radius.xl,
    overflow: 'hidden', ...shadow.card, shadowOpacity: 0.2,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 28, paddingBottom: 18 },
});
