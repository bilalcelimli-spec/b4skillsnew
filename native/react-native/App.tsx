import React, { useEffect, useRef, useState } from 'react';
import { pointerCursor, useHover } from './src/components/hover';
import {
  ActivityIndicator, AppState, Linking, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './src/components/Icon';
import { Button, Eyebrow, Field, IconButton, Message, Sheet, Wordmark } from './src/components/ui';
import { B4Native } from './src/native';
import { Ready, SkillGrid } from './src/screens/Home';
import { Onboarding } from './src/screens/Onboarding';
import { ItemScreen } from './src/screens/ItemScreen';
import { NextStep, Recovery, Results } from './src/screens/Results';
import { color, font, IconName, skillMeta, type } from './src/theme';
import { AssessmentState, useAssessment } from './src/useAssessment';
import { useRecorder } from './src/useRecorder';
import { useAndroidBack, useAndroidKeyboardHeight } from './src/androidSystem';

type SheetName = 'help' | 'skills' | 'connection' | 'logout' | null;

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Exam focus: no clock/notifications chrome; it was also unreadable over the navy sidebar. */}
      <StatusBar hidden barStyle="dark-content" />
      <Shell />
    </SafeAreaProvider>
  );
}

function Shell() {
  const store = useAssessment();
  const recorder = useRecorder();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scroll = useRef<ScrollView>(null);
  // First run: the introduction is shown once (until finished), then sign-in opens on the chosen method.
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => {
    B4Native.getPref('onboarded').then(v => setOnboarded(v === '1'), () => setOnboarded(false));
  }, []);

  const canShowSidebar = width >= 1000;
  const showSidebar = canShowSidebar && sidebarOpen;
  const wide = width - (showSidebar ? 272 : 0) >= 860;

  // A new item starts with a clean recorder and no playback.
  const itemId = store.item?.id;
  useEffect(() => {
    recorder.clear();
    B4Native.stopPlayback();
    scroll.current?.scrollTo({ y: 0, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, store.phase]);

  // Leaving the foreground stops recording and playback. The backend's exam clock does not stop.
  const { interrupted } = store;
  const { recording, stop } = recorder;
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        if (recording) stop();
        B4Native.stopPlayback();
        interrupted();
      }
    });
    return () => sub.remove();
  }, [interrupted, recording, stop]);

  // Android: back never leaves a running exam (open sheets still close first).
  const examRunning = !!store.candidate && ['item', 'uncertain', 'next', 'launchPending'].includes(store.phase);
  useAndroidBack(examRunning, () => true);
  // Android edge-to-edge: the window does not shrink for the keyboard, so pad by its height.
  const keyboard = useAndroidKeyboardHeight();

  const crumb = store.phase === 'item' ? 'Değerlendirme' : store.phase === 'finished' ? 'Sonuçlarım' : store.candidate ? 'Genel bakış' : 'Giriş';

  const sheets = (
    <>
      <HelpSheet visible={sheet === 'help'} onClose={() => setSheet(null)} />
      <Sheet visible={sheet === 'skills'} onClose={() => setSheet(null)} eyebrow="Dört beceri" title="Bir dil, birçok yön.">
        <Text style={[type.body, { color: color.muted }]}>
          Okuma, dinleme, yazma ve konuşma becerileriniz bir arada değerlendirilir. Programınıza göre kelime bilgisi ve dil bilgisi bölümleri de yer alabilir.
        </Text>
        <SkillGrid />
      </Sheet>
      <ConnectionSheet visible={sheet === 'connection'} onClose={() => setSheet(null)} store={store} />
      <Sheet visible={sheet === 'logout'} onClose={() => setSheet(null)} eyebrow="Çıkış" title="Çıkış yapılsın mı?">
        <Text style={[type.body, { color: color.muted }]}>
          Gönderilmemiş yanıtlar bu cihazdan silinir. Başladığınız sınavın sunucudaki süresi durmaz; aynı oturum kimliğiyle yeniden girebilirsiniz.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Button label="Çıkış yap" icon="logout" variant="danger" onPress={() => { setSheet(null); recorder.clear(); store.logout(); }} />
          <Button label="Vazgeç" variant="ghost" onPress={() => setSheet(null)} />
        </View>
      </Sheet>
    </>
  );

  // Signed out, and while a saved sign-in is restored: always the logo page first. The
  // introduction runs once; sign-in itself lives on its last screen (no separate sign-in screen).
  if (store.restoring || !store.candidate) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, keyboard), backgroundColor: color.aubergine }}>
        <Onboarding
          store={store}
          introSeen={onboarded === true}
          onIntroSeen={() => { B4Native.setPref('onboarded', '1'); setOnboarded(true); }}
          onHelp={() => setSheet('help')}
          onConnection={__DEV__ ? () => setSheet('connection') : undefined}
        />
        {sheets}
      </View>
    );
  }

  let body: React.ReactNode;
  if (store.phase === 'finished') {
    body = <Results store={store} wide={wide} />;
  } else if (store.phase === 'uncertain') {
    body = <Recovery store={store} />;
  } else if (store.phase === 'item' && store.item) {
    body = <ItemScreen key={store.item.id} store={store} recorder={recorder} item={store.item} wide={wide} />;
  } else if (store.phase === 'next') {
    body = <NextStep store={store} />;
  } else {
    body = <Ready store={store} recorder={recorder} wide={wide} />;
  }

  return (
    <View style={[styles.root, { paddingBottom: keyboard }]}>
      {showSidebar ? <Sidebar store={store} onSheet={setSheet} topInset={insets.top} /> : null}
      <View style={{ flex: 1 }}>
        {!canShowSidebar ? <CompactBar store={store} onSheet={setSheet} topInset={insets.top} /> : null}
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingTop: canShowSidebar ? insets.top + 18 : 26, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.column}>
            {canShowSidebar ? (
              <View style={styles.topbar}>
                <IconButton icon="sidebar" label={sidebarOpen ? 'Kenar çubuğunu gizle' : 'Kenar çubuğunu göster'} onPress={() => setSidebarOpen(o => !o)} />
                <Text style={[type.small, { color: color.muted }]}>Aday alanı</Text>
                <Icon name="chevronRight" size={12} color={color.faint} />
                <Text style={[type.small, { color: color.ink, fontWeight: '600' }]}>{crumb}</Text>
                <View style={{ flex: 1 }} />
                {!sidebarOpen ? <Wordmark size="sm" /> : null}
                <IconButton icon="help" label="Yardım ve destek" onPress={() => setSheet('help')} />
              </View>
            ) : null}
            {store.error ? <Message tone="error" text={store.error} onDismiss={() => store.setError(null)} /> : null}
            {store.notice ? <Message text={store.notice} onDismiss={() => store.setNotice(null)} /> : null}
            {body}
            <Footer store={store} />
          </View>
        </ScrollView>
      </View>

      {sheets}
    </View>
  );
}

function initials(name?: string | null) {
  const parts = (name || 'Aday').trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p.charAt(0)).join('').toLocaleUpperCase('tr-TR');
}

function NavRow({ icon, label, active, onPress }: { icon: IconName; label: string; active?: boolean; onPress?: () => void }) {
  const [hovered, hoverProps] = useHover();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      {...hoverProps}
      style={[styles.nav, active && styles.navActive, !active && hovered && { backgroundColor: 'rgba(255,255,255,0.06)' }, pointerCursor as any]}
    >
      <Icon name={icon} size={17} color={active ? color.onDark : 'rgba(255,255,255,0.62)'} />
      <Text style={[styles.navText, active && { color: color.onDark }]} numberOfLines={1}>{label}</Text>
      {active ? <View style={styles.navDot} /> : null}
    </Pressable>
  );
}

function Sidebar({ store, onSheet, topInset }: { store: AssessmentState; onSheet: (s: SheetName) => void; topInset: number }) {
  const skill = store.phase === 'item' && store.item ? skillMeta(store.item.skill) : null;
  return (
    <View style={[styles.sidebar, { paddingTop: topInset + 30 }]}>
      <Wordmark />
      <Text style={styles.tagline}>ENGLISH ASSESSMENT</Text>
      <View style={styles.sideRule} />
      <Text style={styles.sideLabel}>ADAY ALANI</Text>
      <View style={{ gap: 4 }}>
        <NavRow icon="grid" label="Değerlendirme" active />
        <NavRow icon="layers" label="Dört beceri" onPress={() => onSheet('skills')} />
        <NavRow icon="help" label="Yardım ve destek" onPress={() => onSheet('help')} />
      </View>

      {skill ? (
        <View style={styles.nowCard}>
          <Text style={[type.eyebrow, { color: color.gold }]}>ŞU AN</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name={skill.icon} size={18} color={color.onDark} />
            <Text style={{ color: color.onDark, fontSize: 16, fontWeight: '600' }}>{skill.label}</Text>
          </View>
          <Text style={[type.caption, { color: color.onDarkMuted }]}>{store.answered} yanıt gönderildi</Text>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />
      <View style={styles.quote}>
        <Icon name="sparkle" size={20} color={color.gold} />
        <Text style={styles.quoteText}>Her becerinizin{'\n'}bir hikâyesi var.</Text>
        <Text style={[type.caption, { color: color.onDarkMuted }]}>İngilizcenizi tüm yönleriyle tanıyın.</Text>
      </View>
      <View style={styles.sideRule} />
      {store.candidate ? (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(store.candidate.displayName)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: color.onDark, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{store.candidate.displayName || 'Aday hesabı'}</Text>
              <Text style={[type.caption, { color: color.onDarkMuted }]} numberOfLines={1}>{store.candidate.email}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => onSheet('logout')} disabled={store.busy}
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, pointerCursor as any]}>
            <Icon name="logout" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={[type.caption, { color: 'rgba(255,255,255,0.6)' }]}>Çıkış yap</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="user" size={14} color={color.onDarkMuted} />
          <Text style={[type.caption, { color: color.onDarkMuted }]}>Size özel bir değerlendirme</Text>
        </View>
      )}
    </View>
  );
}

function CompactBar({ store, onSheet, topInset }: { store: AssessmentState; onSheet: (s: SheetName) => void; topInset: number }) {
  return (
    <View style={[styles.compact, { paddingTop: topInset + 12 }]}>
      <Wordmark size="sm" />
      <View style={{ flex: 1 }} />
      {store.phase === 'item' && store.item ? (
        <Text style={[type.caption, { color: color.onDarkMuted, marginRight: 8 }]}>{skillMeta(store.item.skill).label} · {store.answered} yanıt</Text>
      ) : null}
      <IconButton icon="layers" label="Dört beceri" onPress={() => onSheet('skills')} tone="rgba(255,255,255,0.75)" />
      <IconButton icon="help" label="Yardım ve destek" onPress={() => onSheet('help')} tone="rgba(255,255,255,0.75)" />
      {store.candidate ? (
        <IconButton icon="logout" label="Çıkış yap" onPress={() => onSheet('logout')} tone="rgba(255,255,255,0.75)" />
      ) : null}
    </View>
  );
}

function Footer({ store }: { store: AssessmentState }) {
  return (
    <View style={{ gap: 8, paddingTop: 8 }}>
      {store.sessionId && store.candidate ? (
        <Text selectable style={{ fontFamily: font.mono, fontSize: 10, color: color.muted }}>Oturum: {store.sessionId}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Text style={[type.caption, { color: color.muted, fontWeight: '700' }]}>b4skills</Text>
        <Text style={[type.caption, { color: color.muted }]}>· İngilizcenizi tüm yönleriyle tanıyın.</Text>
      </View>
    </View>
  );
}

function HelpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} eyebrow="Yardım ve destek" title="Nasıl yardımcı olabiliriz?">
      <Text style={[type.body, { color: color.muted }]}>
        Giriş veya sınav erişimiyle ilgili bir sorun yaşıyorsanız kurumunuzla görüşün. Destek isterken ekranın altındaki oturum kimliğinizi paylaşabilirsiniz.
      </Text>
      <Button label="hello@b4skills.com" icon="mail" variant="secondary" onPress={() => Linking.openURL('mailto:hello@b4skills.com')} />
      <View style={styles.helpNote}>
        <Eyebrow tone={color.muted}>Bu sürümde</Eyebrow>
        <Text style={[type.small, { color: color.body }]}>
          Çoktan seçmeli, yazılı ve sesli yanıtlar desteklenir. Gözetimli sınavlar, sürükle-bırak ve entegre görevler için web uygulamasını kullanın.
        </Text>
      </View>
    </Sheet>
  );
}

function ConnectionSheet({ visible, onClose, store }: { visible: boolean; onClose: () => void; store: AssessmentState }) {
  const [value, setValue] = useState(store.address);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (visible) { setValue(store.address); setError(null); } }, [visible, store.address]);
  const save = () => {
    const problem = store.saveAddress(value);
    if (problem) setError(problem); else onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} eyebrow="Bağlantı" title="Sunucu adresi">
      <Field label="Sunucu adresi" icon="globe" value={value} onChangeText={setValue} placeholder="https://app.b4skills.com"
        keyboardType="url" textContentType="URL" onSubmitEditing={save} returnKeyType="done" />
      <Text style={[type.small, { color: color.muted }]}>
        {Platform.OS === 'macos' ? 'Bu Mac' : 'Simülatör'} için geliştirmede http://localhost:3001 kullanılır. Fiziksel iPad'de Mac'in yerel ağ adresini girin. Uzak sunucular HTTPS gerektirir.
      </Text>
      {error ? <Message tone="error" text={error} /> : null}
      <Button label="Kaydet" block onPress={save} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: color.canvas },
  loading: { paddingVertical: 120, alignItems: 'center' },
  content: { paddingHorizontal: 32, alignItems: 'center' },
  column: { width: '100%', maxWidth: 1120, gap: 24 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: -8 },
  sidebar: { width: 272, backgroundColor: color.navy, paddingHorizontal: 22, paddingBottom: 28 },
  tagline: { marginTop: 14, fontSize: 9, fontWeight: '600', letterSpacing: 2.2, color: 'rgba(255,255,255,0.45)' },
  sideRule: { height: 1, backgroundColor: color.onDarkFaint, marginVertical: 26 },
  sideLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, color: 'rgba(255,255,255,0.5)', marginBottom: 12 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, height: 46, borderRadius: 13 },
  navActive: { backgroundColor: color.plum },
  navText: { flex: 1, fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.62)' },
  navDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.gold },
  nowCard: { marginTop: 22, padding: 16, gap: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(253,224,71,0.25)', backgroundColor: 'rgba(253,224,71,0.06)' },
  quote: { padding: 18, gap: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.045)' },
  quoteText: { fontFamily: font.serif, fontSize: 20, lineHeight: 26, color: color.onDark },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800', color: color.navy },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: color.navy },
  helpNote: { gap: 8, padding: 16, borderRadius: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
});
