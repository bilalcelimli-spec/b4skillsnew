// Signed-out experience. Every launch opens on the logo-only page with "Devam et". The first time,
// a five-screen introduction follows; afterwards "Devam et" goes straight to its last screen,
// where sign-in happens in place: exam code or email. There is no separate sign-in screen.
import React, { useEffect, useRef, useState } from 'react';
import { pointerCursor, useHover } from '../components/hover';
import { Animated, Easing, LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Icon } from '../components/Icon';
import { LogoHalo } from '../components/LogoHalo';
import { Button, IconButton } from '../components/ui';
import { color, IconName, type } from '../theme';
import { AssessmentState } from '../useAssessment';
import { AccountCard, CodeCard } from './SignInCards';

export type SignInMode = 'code' | 'email';

type Page = { eyebrow: string; title: string; body: string; art: React.ReactNode };

const onDarkMuted = 'rgba(255,255,255,0.66)';

export function Onboarding({ store, introSeen, onIntroSeen, onHelp, onConnection }: {
  store: AssessmentState;
  introSeen: boolean;
  onIntroSeen: () => void;
  onHelp: () => void;
  onConnection?: () => void;
}) {
  const [step, setStep] = useState(-1); // -1 = logo page, 0…4 = introduction
  const [signIn, setSignIn] = useState<SignInMode | null>(null);
  const screen = useWindowDimensions();
  // Measured, not useWindowDimensions: on macOS that reports the screen, not the window.
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const width = box?.width ?? screen.width;
  const height = box?.height ?? screen.height;
  const measure = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox(b => (b && b.width === w && b.height === h ? b : { width: w, height: h }));
  };
  const fade = useRef(new Animated.Value(0)).current;

  const pages = PAGES(width);
  const lastIndex = pages.length - 1;
  const last = step === lastIndex;

  useEffect(() => {
    fade.setValue(0);
    // react-native-macos 0.83 quits silently with the native animation driver here, so macOS animates in JS.
    Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'macos' }).start();
  }, [fade, step, signIn]);

  // Reaching the sign-in screen counts as having seen the introduction.
  useEffect(() => { if (last && !introSeen) onIntroSeen(); }, [last, introSeen, onIntroSeen]);

  const appear = {
    opacity: fade,
    transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  if (step === -1) {
    const logoW = Math.min(640, width * 0.62, (height * 0.42) * 3);
    return (
      <View style={styles.page} onLayout={measure}>
        <Animated.View style={[styles.splashCentre, { opacity: fade }]}>
          <LogoHalo width={logoW} />
        </Animated.View>
        <View style={styles.splashBottom}>
          {store.restoring ? (
            // A plain label, not ActivityIndicator: that made react-native-macos 0.83 quit at launch.
            <View style={{ height: 50, justifyContent: 'center' }}><Text style={{ color: onDarkMuted, fontSize: 14 }}>Yükleniyor…</Text></View>
          ) : (
            <Button label="Devam et" trailingIcon="arrowRight" onPress={() => setStep(introSeen ? lastIndex : 0)} style={styles.cta} />
          )}
        </View>
      </View>
    );
  }

  const page = pages[step];
  const compact = width < 700;
  // Short windows (a Mac window, iPad landscape with the keyboard): the art is decorative, so it
  // shrinks first, and on the sign-in screen it goes so the content never meets the footer.
  const short = height < 900;
  const showArt = !(last && (short || signIn));
  const choose = (mode: SignInMode | null) => { store.setError(null); setSignIn(mode); };
  const copy = last && signIn
    ? signIn === 'code'
      ? { eyebrow: 'Sınav kodu', title: 'Kodunuzla başlayın.', body: 'Kurumunuzun verdiği sınav kodunu girin, ardından aday bilgilerinizi tamamlayın.' }
      : { eyebrow: 'Hesabınız', title: 'E-posta ile giriş yapın.', body: 'Kurumunuzun verdiği B4Skills hesabının e-posta adresi ve şifresiyle devam edin.' }
    : page;

  return (
    <View style={styles.page} onLayout={measure}>
      <View style={styles.topBar}>
        <LogoHalo width={compact ? 110 : 132} halo={false} />
        <View style={{ flex: 1 }} />
        {onConnection ? <IconButton icon="sliders" label="Sunucu adresi" onPress={onConnection} tone="rgba(255,255,255,0.7)" /> : null}
        <IconButton icon="help" label="Yardım ve destek" onPress={onHelp} tone="rgba(255,255,255,0.7)" />
        {!last ? <Button label="Atla" variant="onDark" compact onPress={() => setStep(lastIndex)} /> : null}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <Animated.View style={[styles.body, (short || signIn) && { gap: 22 }, appear]} key={`${step}-${signIn ?? ''}`}>
          {showArt ? (
            <View style={[styles.art, { minHeight: short ? 0 : Math.min(320, height * 0.34) }]}>{page.art}</View>
          ) : null}
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>{copy.eyebrow.toLocaleUpperCase('tr-TR')}</Text>
            <Text style={[styles.title, (compact || short || signIn) && { fontSize: 30, lineHeight: 36 }]}>{copy.title}</Text>
            <Text style={styles.text}>{copy.body}</Text>
          </View>
          {last && !signIn ? (
            <View style={styles.choices}>
              <Choice icon="hash" title="Sınav kodum var" hint="Kurumunuzun verdiği kodla başlayın" onPress={() => choose('code')} primary />
              <Choice icon="mail" title="E-posta ile giriş yap" hint="B4Skills hesabınızla devam edin" onPress={() => choose('email')} />
            </View>
          ) : null}
          {last && signIn ? (
            <View style={{ gap: 16 }}>
              {signIn === 'code' ? <CodeCard store={store} autoFocus /> : <AccountCard store={store} autoFocus showHeader={false} />}
              <Button
                label={signIn === 'code' ? 'Bunun yerine e-posta ile giriş yap' : 'Bunun yerine sınav kodu kullan'}
                icon={signIn === 'code' ? 'mail' : 'hash'} variant="onDark"
                onPress={() => choose(signIn === 'code' ? 'email' : 'code')} style={{ alignSelf: 'center' }}
              />
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          {last && signIn ? (
            <Button label="Seçenekler" icon="chevronLeft" variant="onDark" onPress={() => choose(null)} style={styles.back} />
          ) : step > 0 ? (
            <Button label="Geri" icon="chevronLeft" variant="onDark" onPress={() => setStep(s => s - 1)} style={styles.back} />
          ) : null}
        </View>
        <View style={styles.dots} accessible accessibilityLabel={`Tanıtım ${step + 1} / ${pages.length}`}>
          {pages.map((_, i) => (
            <Pressable key={i} onPress={() => { choose(null); setStep(i); }} accessibilityRole="button" accessibilityLabel={`${i + 1}. ekran`} hitSlop={8}
              style={[styles.dot, i === step && styles.dotActive, pointerCursor as any]} />
          ))}
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          {!last ? <Button label="Devam et" trailingIcon="arrowRight" onPress={() => setStep(s => s + 1)} style={styles.next} /> : null}
        </View>
      </View>
    </View>
  );
}

function Choice({ icon, title, hint, onPress, primary }: { icon: IconName; title: string; hint: string; onPress: () => void; primary?: boolean }) {
  const [hovered, hoverProps] = useHover();
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={title} accessibilityHint={hint}
      onPress={onPress} {...hoverProps}
      style={({ pressed }) => [
        styles.choice,
        primary ? styles.choicePrimary : styles.choiceSecondary,
        (pressed || hovered) && (primary ? { backgroundColor: color.plumDark } : { backgroundColor: 'rgba(255,255,255,0.12)' }),
        pointerCursor as any,
      ]}
    >
      <View style={[styles.choiceIcon, primary ? { backgroundColor: 'rgba(255,255,255,0.16)' } : { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
        <Icon name={icon} size={22} color={color.onDark} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceHint}>{hint}</Text>
      </View>
      <Icon name="arrowRight" size={20} color={color.onDark} />
    </Pressable>
  );
}

// ——— Illustrations: drawn from views and the app's own icons; no fabricated scores or claims. ———

function Ladder() {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  return (
    <View style={styles.ladder} accessible accessibilityLabel="CEFR düzeyleri A1'den C2'ye">
      {levels.map((l, i) => (
        <View key={l} style={{ alignItems: 'center', gap: 10 }}>
          <View style={[styles.rung, { height: 46 + i * 30, opacity: 0.35 + i * 0.13 }]} />
          <Text style={styles.rungLabel}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

function SkillsArt() {
  const items: [IconName, string][] = [['book', 'Reading'], ['headphones', 'Listening'], ['pen', 'Writing'], ['waveform', 'Speaking']];
  return (
    <View style={styles.skillGrid}>
      {items.map(([icon, label]) => (
        <View key={label} style={styles.skill}>
          <View style={styles.skillIcon}><Icon name={icon} size={26} color={color.onDark} /></View>
          <Text style={styles.skillLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function PrepArt() {
  const rows: [IconName, string, string][] = [
    ['headphones', 'Kulaklık', 'Dinleme kayıtları en fazla iki kez çalınır'],
    ['mic', 'Mikrofon', 'Konuşma yanıtları kaydedilir, en fazla 3 dakika'],
    ['clock', 'Zaman', 'Başladığınızda süre sunucuda işler'],
  ];
  return (
    <View style={styles.prep}>
      {rows.map(([icon, title, hint]) => (
        <View key={title} style={styles.prepRow}>
          <View style={styles.prepIcon}><Icon name={icon} size={20} color={color.gold} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.prepTitle}>{title}</Text>
            <Text style={styles.prepHint}>{hint}</Text>
          </View>
          <Icon name="check" size={18} color="rgba(255,255,255,0.5)" />
        </View>
      ))}
    </View>
  );
}

function ResultsArt() {
  // Illustrative layout only, labelled as such: no level or score is implied.
  const bars = [0.8, 0.62, 0.7, 0.48];
  return (
    <View style={styles.result}>
      <View style={styles.resultHead}>
        <Text style={styles.resultEyebrow}>ÖRNEK GÖRÜNÜM</Text>
        <Icon name="target" size={18} color={color.gold} />
      </View>
      <Text style={styles.resultLevel}>CEFR</Text>
      {bars.map((v, i) => (
        <View key={i} style={styles.resultRow}>
          <View style={[styles.resultDot, { opacity: 0.5 + i * 0.12 }]} />
          <View style={styles.resultTrack}><View style={[styles.resultFill, { width: `${v * 100}%` }]} /></View>
        </View>
      ))}
    </View>
  );
}

function StartArt() {
  return (
    <View style={styles.start}>
      <View style={styles.startRing}><Icon name="arrowRight" size={40} color={color.onDark} /></View>
    </View>
  );
}

const PAGES = (width: number): Page[] => [
  {
    eyebrow: 'Uyarlanabilir değerlendirme',
    title: 'Seviyenize uyum sağlayan bir sınav.',
    body: 'Sorular yanıtlarınıza göre zorlaşır ya da kolaylaşır. İngilizce düzeyiniz A1’den C2’ye CEFR ölçeğinde belirlenir.',
    art: <Ladder />,
  },
  {
    eyebrow: 'Dört beceri',
    title: 'Okuyun, dinleyin, yazın, konuşun.',
    body: 'Okuma, dinleme, yazma ve konuşma tek bir oturumda değerlendirilir. Programınıza göre dil bilgisi ve kelime bölümleri de yer alabilir.',
    art: <SkillsArt />,
  },
  {
    eyebrow: 'Hazırlık',
    title: 'Sessiz bir ortam, kulaklık ve mikrofon.',
    body: 'Başlamadan önce mikrofonunuzu uygulamada deneyebilirsiniz. Dinleme ve konuşma bölümleri için cihazınızın hazır olduğundan emin olun.',
    art: <PrepArt />,
  },
  {
    eyebrow: 'Sonuçlar',
    title: 'Düzeyinizi ve becerilerinizi görün.',
    body: 'Sınav bitince geçici CEFR düzeyinizi ve beceri görünümünüzü görürsünüz. Yazma ve konuşma yanıtları incelendikçe sonuçlar güncellenir.',
    art: <ResultsArt />,
  },
  {
    eyebrow: 'Başlayalım',
    title: width < 700 ? 'Nasıl giriş yapmak istersiniz?' : 'Nasıl giriş yapmak\nistersiniz?',
    body: 'Kurumunuz size bir sınav kodu verdiyse kodla başlayın. Bir B4Skills hesabınız varsa e-posta ve şifrenizle giriş yapın.',
    art: <StartArt />,
  },
];

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.aubergine, overflow: 'hidden' },
  splashCentre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashBottom: { alignItems: 'center', paddingBottom: 56, paddingHorizontal: 24 },
  cta: { minWidth: 240, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingTop: 22, paddingBottom: 6 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  body: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 28, gap: 34 },
  art: { alignItems: 'center', justifyContent: 'center' },
  copy: { gap: 14 },
  eyebrow: { ...type.eyebrow, color: color.gold, letterSpacing: 2.4 },
  title: { color: color.onDark, fontSize: 38, lineHeight: 44, fontWeight: '700', letterSpacing: -1.1 },
  text: { ...type.body, fontSize: 17, lineHeight: 26, color: onDarkMuted },
  choices: { gap: 12 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 18 },
  choicePrimary: { backgroundColor: color.plum },
  choiceSecondary: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  choiceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { color: color.onDark, fontSize: 17, fontWeight: '600' },
  choiceHint: { color: onDarkMuted, fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 34, paddingTop: 12 },
  dots: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  // Button defaults to alignSelf flex-start; the footer columns need their own edge.
  next: { minWidth: 180, alignSelf: 'flex-end' },
  back: { alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 26, backgroundColor: color.gold },
  ladder: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  rung: { width: 44, borderRadius: 12, backgroundColor: color.logoMagenta },
  rungLabel: { color: color.onDark, fontSize: 13, fontWeight: '700' },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, width: 340, justifyContent: 'center' },
  skill: { width: 160, paddingVertical: 20, borderRadius: 20, alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  skillIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: color.plum, alignItems: 'center', justifyContent: 'center' },
  skillLabel: { color: color.onDark, fontSize: 15, fontWeight: '600' },
  prep: { width: '100%', maxWidth: 440, gap: 10 },
  prepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  prepIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(253,224,71,0.1)', alignItems: 'center', justifyContent: 'center' },
  prepTitle: { color: color.onDark, fontSize: 15, fontWeight: '600' },
  prepHint: { color: onDarkMuted, fontSize: 13 },
  result: { width: 320, padding: 24, gap: 12, borderRadius: 22, backgroundColor: color.navy, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  resultHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultEyebrow: { color: color.gold, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  resultLevel: { color: color.gold, fontSize: 44, fontWeight: '700', letterSpacing: -1, marginBottom: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.logoMagenta },
  resultTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  resultFill: { height: 6, borderRadius: 3, backgroundColor: color.logoMagenta },
  start: { alignItems: 'center', justifyContent: 'center' },
  startRing: { width: 120, height: 120, borderRadius: 60, backgroundColor: color.plum, alignItems: 'center', justifyContent: 'center', borderWidth: 10, borderColor: 'rgba(200,36,110,0.35)' },
});
