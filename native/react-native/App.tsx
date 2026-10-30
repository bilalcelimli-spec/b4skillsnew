import { ScrollView } from './src/i18n/ScrollView';
import { hydrateLanguage, useLanguage } from './src/i18n/store';
import { LanguagePicker } from './src/i18n/LanguagePicker';
import { Text } from "./src/i18n/Text";
import { t } from "./src/i18n/core";
import { proctoringCoordinator } from './src/proctoring/coordinator';
import React, { useEffect, useRef, useState } from 'react';
import { pointerCursor, useHover } from './src/components/hover';
import { AppState, Linking, Platform, Pressable, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './src/components/Icon';
import { Button, Eyebrow, Field, IconButton, Message, Sheet, Wordmark } from './src/components/ui';
import { B4Native } from './src/native';
import { Ready, SkillGrid } from './src/screens/Home';
import { Onboarding } from './src/screens/Onboarding';
import { ItemScreen } from './src/screens/ItemScreen';
import { LaunchRecovery, NextStep, Recovery, Results } from './src/screens/Results';
import { color, font, IconName, skillMeta, type } from './src/theme';
import { AssessmentState, useAssessment } from './src/useAssessment';
import { useRecorder } from './src/useRecorder';
import { ProctoringMonitor } from './src/components/ProctoringMonitor';
import { useExamMonitor, type ExamMonitorState } from './src/proctoring/useExamMonitor';
import { useAndroidBack, useAndroidKeyboardHeight } from './src/androidSystem';
import { useUpdateGate } from './src/useUpdateGate';
import { APP_BUILD } from './src/appUpdate';
type SheetName = 'help' | 'skills' | 'connection' | 'logout' | null;
export default function App() {
  useEffect(() => { void hydrateLanguage(); }, []);
  return <SafeAreaProvider>
      {/* Exam focus: no clock/notifications chrome; it was also unreadable over the navy sidebar. */}
      <StatusBar hidden barStyle="dark-content" />
      <Shell />
    </SafeAreaProvider>;
}
function Shell() {
  const { rtl } = useLanguage();
  const store = useAssessment();
  const recorder = useRecorder();
  const {
    width
  } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // First run: the introduction is shown once (until finished), then sign-in opens on the chosen method.
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => {
    B4Native.getPref('onboarded').then(v => setOnboarded(v === '1'), () => setOnboarded(false));
  }, []);
  // Web parity: monitoring runs in every exam, from the first item until results.
  const examActive = !!store.candidate && !!store.sessionId && ['item', 'next', 'uncertain'].includes(store.phase);
  const monitor = useExamMonitor(store.cameraBackend, store.sessionId, store.photoDelivery, store.recordFace, examActive);
  const updateGate = useUpdateGate(store.address);
  const canShowSidebar = width >= 1000;
  const showSidebar = canShowSidebar && sidebarOpen;
  const wide = width - (showSidebar ? 272 : 0) >= 860;

  // A new item starts with a clean recorder and no playback.
  const itemId = store.item?.id;
  useEffect(() => {
    recorder.clear();
    proctoringCoordinator.stop('playback');
    B4Native.stopPlayback();
    scroll.current?.scrollTo({
      y: 0,
      animated: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // Leaving the foreground stops recording and playback. The backend's exam clock does not stop.
  const {
    interrupted
  } = store;
  const {
    recording,
    stop
  } = recorder;
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        if (recording) stop();
        proctoringCoordinator.stop('playback');
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
  const crumb = store.phase === 'item' ? t("Değerlendirme") : store.phase === 'finished' ? t("Sonuçlarım") : store.candidate ? t("Genel bakış") : t("Giriş");
  const sheets = <>
      <HelpSheet visible={sheet === 'help'} onClose={() => setSheet(null)} />
      <Sheet visible={sheet === 'skills'} onClose={() => setSheet(null)} eyebrow={t("Dört beceri")} title={t("Bir dil, birçok yön.")}>
        <Text style={[type.body, {
        color: color.muted
      }]}>{t("Okuma, dinleme, yazma ve konuşma becerileriniz bir arada değerlendirilir. Programınıza göre kelime bilgisi ve dil bilgisi bölümleri de yer alabilir.")}</Text>
        <SkillGrid />
      </Sheet>
      <ConnectionSheet visible={sheet === 'connection'} onClose={() => setSheet(null)} store={store} />
      <Sheet visible={sheet === 'logout'} onClose={() => setSheet(null)} eyebrow={t("Çıkış")} title={t("Çıkış yapılsın mı?")}>
        <Text style={[type.body, {
        color: color.muted
      }]}>{t("Gönderilmemiş yanıtlar bu cihazdan silinir. Başladığınız sınavın sunucudaki süresi durmaz; aynı oturum kimliğiyle yeniden girebilirsiniz.")}</Text>
        <View style={{
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap'
      }}>
          <Button label={t("Çıkış yap")} icon="logout" variant="danger" onPress={() => {
          setSheet(null);
          recorder.clear();
          store.logout();
        }} />
          <Button label={t("Vazgeç")} variant="ghost" onPress={() => setSheet(null)} />
        </View>
      </Sheet>
    </>;

  // Unsupported build: blocks sign-in and new exams, never an exam already under way.
  if (updateGate.required && !examActive) {
    return <UpdateRequired checking={updateGate.checking} onCheck={updateGate.check} topInset={insets.top} />;
  }

  // Signed out, and while a saved sign-in is restored: always the logo page first. The
  // introduction runs once; sign-in itself lives on its last screen (no separate sign-in screen).
  if (store.restoring || !store.candidate) {
    return <View style={{
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: Math.max(insets.bottom, keyboard),
      backgroundColor: color.aubergine, direction: rtl ? 'rtl' : 'ltr'
    }}>
        <Onboarding store={store} introSeen={onboarded === true} onIntroSeen={() => {
        B4Native.setPref('onboarded', '1');
        setOnboarded(true);
      }} onHelp={() => setSheet('help')} onConnection={__DEV__ ? () => setSheet('connection') : undefined} />
        {sheets}
      </View>;
  }
  let body: React.ReactNode;
  if (store.phase === 'finished') {
    body = <Results store={store} wide={wide} />;
  } else if ((store.phase === 'item' || store.phase === 'uncertain') && store.item) {
    body = <View>
      {/* Keep local text/choice drafts mounted while reconciling a failed submission. */}
      <View style={store.phase === 'uncertain' ? {
        display: 'none'
      } : undefined}>
        <ItemScreen key={store.item.id} store={store} recorder={recorder} item={store.item} wide={wide} />
      </View>
      {store.phase === 'uncertain' ? <Recovery store={store} /> : null}
    </View>;
  } else if (store.phase === 'launchPending') {
    body = <LaunchRecovery store={store} />;
  } else if (store.phase === 'next') {
    body = <NextStep store={store} />;
  } else {
    body = <Ready store={store} recorder={recorder} wide={wide} />;
  }
  return <View style={[styles.root, { direction: rtl ? 'rtl' : 'ltr', paddingBottom: keyboard }]}>
      {showSidebar ? <Sidebar store={store} onSheet={setSheet} topInset={insets.top} monitor={examActive ? monitor : null} /> : null}
      <View style={{
      flex: 1
    }}>
        {!canShowSidebar ? <CompactBar store={store} onSheet={setSheet} topInset={insets.top} /> : null}
        {examActive && !showSidebar ? <ProctoringMonitor monitor={monitor} variant="compact" /> : null}
        <ScrollView ref={scroll} style={{
        flex: 1
      }} contentContainerStyle={[styles.content, {
        paddingTop: canShowSidebar ? insets.top + 18 : 26,
        paddingBottom: insets.bottom + 32
      }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          <View style={styles.column}>
            {canShowSidebar ? <View style={styles.topbar}>
                <IconButton icon="sidebar" label={sidebarOpen ? t("Kenar çubuğunu gizle") : t("Kenar çubuğunu göster")} onPress={() => setSidebarOpen(o => !o)} />
                <Text style={[type.small, {
              color: color.muted
            }]}>{t("Aday alanı")}</Text>
                <Icon name="chevronRight" size={12} color={color.faint} />
                <Text style={[type.small, {
              color: color.ink,
              fontWeight: '600'
            }]}>{crumb}</Text>
                <View style={{
              flex: 1
            }} />
                {!sidebarOpen ? <Wordmark size="sm" /> : null}
                <LanguagePicker /><IconButton icon="help" label={t("Yardım ve destek")} onPress={() => setSheet('help')} />
              </View> : null}
            {store.error ? <Message tone="error" text={store.error} onDismiss={() => store.setError(null)} /> : null}
            {store.candidate && (store.photoDelivery.pending.length > 0 || store.photoDelivery.error) ? <View style={{
            gap: 8
          }}>
              <Message text={store.photoDelivery.error && !store.photoDelivery.pending.length ? t("Şifreli fotoğraf kuyruğunun durumu doğrulanamadı. Kayıtlar korunuyor.") : t("Şifreli fotoğraf kuyruğu: {0} bekleyen. Teslim sunucu onayından sonra tamamlanır.", [store.photoDelivery.pending.length])} />
              {store.photoDelivery.error ? <Message tone="error" text={store.photoDelivery.error} /> : null}
              {store.photoDelivery.pending.map(p => <View key={p.evidenceId} style={{
              gap: 8
            }}>
                <Message text={p.failure ? p.failure === 'quota' ? t("Oturumun fotoğraf sınırına ulaşıldı. Bekleyen kaydı cihazdan silebilir veya kurumunuzla iletişime geçebilirsiniz.") : p.failure === 'expired' ? t("Fotoğrafın teslim süresi doldu. Yeniden çekin veya bu kaydı silin.") : t("Sunucu bu fotoğrafı kabul etmedi. Yeniden çekin veya bu kaydı silin.") : t("Onaylanan fotoğrafın teslimi bekleniyor. Uygulama yeniden açıldığında aynı hesapla devam eder.")} />
                <Button label={t("Bekleyen fotoğrafı cihazdan sil")} variant="ghost" onPress={() => store.photoDelivery.discard(p.evidenceId)} />
              </View>)}
              <Button label={t("Fotoğraf teslimini yeniden dene")} variant="secondary" onPress={store.photoDelivery.retry} />
            </View> : null}
            {store.auditWarning ? <View style={{
            gap: 8
          }}><Message tone="error" text={store.auditWarning} /><Button label={t("Olay teslimini yeniden dene")} variant="secondary" onPress={store.retryAudit} /></View> : null}
            {store.notice ? <Message text={store.notice} onDismiss={() => store.setNotice(null)} /> : null}
            {body}
            <Footer store={store} />
          </View>
        </ScrollView>
      </View>

      {sheets}
    </View>;
}
function UpdateRequired({ checking, onCheck, topInset }: { checking: boolean; onCheck: () => void; topInset: number }) {
  const { rtl } = useLanguage();
  return <View style={[styles.update, rtl ? styles.rtl : styles.ltr, { paddingTop: topInset + 24 }]}>
      <View style={styles.updateBar}><LanguagePicker dark /></View>
      <View style={styles.updateBody} accessibilityRole="alert">
        <Wordmark />
        <Text style={styles.updateTitle}>{t("Uygulamayı güncelleyin")}</Text>
        <Text style={styles.updateText}>{t("Bu sürüm artık sınav için desteklenmiyor. Devam etmek için B4Skills'in son sürümünü uygulama mağazasından yükleyin. Yanıtlarınız ve sonuçlarınız sunucuda korunur.")}</Text>
        <Text style={styles.updateBuild}>{t("Bu cihazdaki sürüm: {0}", [APP_BUILD])}</Text>
        <Button label={t("Yeniden kontrol et")} loading={checking} onPress={onCheck} />
      </View>
    </View>;
}
function initials(name?: string | null) {
  const parts = (name || 'Aday').trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p.charAt(0)).join('').toLocaleUpperCase('tr-TR');
}
function NavRow({
  icon,
  label,
  active,
  onPress
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const [hovered, hoverProps] = useHover();
  return <Pressable accessibilityRole="button" accessibilityState={{
    selected: !!active
  }} onPress={onPress} {...hoverProps} style={[styles.nav, active && styles.navActive, !active && hovered && {
    backgroundColor: 'rgba(255,255,255,0.06)'
  }, pointerCursor]}>
      <Icon name={icon} size={17} color={active ? color.onDark : 'rgba(255,255,255,0.62)'} />
      <Text style={[styles.navText, active && {
      color: color.onDark
    }]} numberOfLines={1}>{label}</Text>
      {active ? <View style={styles.navDot} /> : null}
    </Pressable>;
}
export function Sidebar({
  store,
  onSheet,
  topInset,
  monitor
}: {
  store: AssessmentState;
  onSheet: (s: SheetName) => void;
  topInset: number;
  monitor: ExamMonitorState | null;
}) {
  const skill = store.phase === 'item' && store.item ? skillMeta(store.item.skill) : null;
  return <View style={[styles.sidebar, {
    paddingTop: topInset + 30
  }]}>
      <Wordmark />
      <Text style={styles.tagline}>{t("ENGLISH ASSESSMENT")}</Text>
      <View style={styles.sideRule} />
      {/* The middle scrolls; the account and sign-out stay pinned at the bottom. During an exam the
          "now" card and camera panel no longer push them off a landscape iPad (1.0.0 build 7). */}
      <ScrollView style={styles.sideScroll} contentContainerStyle={styles.sideScrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sideLabel}>{t("ADAY ALANI")}</Text>
      <View style={{
      gap: 4
    }}>
        <NavRow icon="grid" label={t("Değerlendirme")} active />
        <NavRow icon="layers" label={t("Dört beceri")} onPress={() => onSheet('skills')} />
        <NavRow icon="help" label={t("Yardım ve destek")} onPress={() => onSheet('help')} />
      </View>

      {skill ? <View style={styles.nowCard}>
          <Text style={[type.eyebrow, {
        color: color.gold
      }]}>{t("ŞU AN")}</Text>
          <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
      }}>
            <Icon name={skill.icon} size={18} color={color.onDark} />
            <Text style={{
          color: color.onDark,
          fontSize: 16,
          fontWeight: '600'
        }}>{skill.label}</Text>
          </View>
          <Text style={[type.caption, {
        color: color.onDarkMuted
      }]}>{store.answered}{t(" yanıt gönderildi")}</Text>
        </View> : null}

      {monitor ? <ProctoringMonitor monitor={monitor} variant="sidebar" /> : null}

      <View style={styles.sideSpacer} />
      {/* Decorative; dropped during the exam to leave room for the camera panel. */}
      {monitor ? null : <View style={styles.quote}>
        <Icon name="sparkle" size={20} color={color.gold} />
        <Text style={styles.quoteText}>{t("Her becerinizin")}{'\n'}{t("bir hikâyesi var.")}</Text>
        <Text style={[type.caption, {
        color: color.onDarkMuted
      }]}>{t("İngilizcenizi tüm yönleriyle tanıyın.")}</Text>
      </View>}
      </ScrollView>
      <View style={styles.sideRuleFooter} />
      {store.candidate ? <View style={{
      gap: 14
    }}>
          <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
      }}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(store.candidate.displayName)}</Text></View>
            <View style={{
          flex: 1
        }}>
              <Text style={{
            color: color.onDark,
            fontSize: 13,
            fontWeight: '600'
          }} numberOfLines={1}>{store.candidate.displayName || t("Aday hesabı")}</Text>
              <Text style={[type.caption, {
            color: color.onDarkMuted
          }]} direction="ltr" numberOfLines={1}>{store.candidate.email}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => onSheet('logout')} disabled={store.busy} style={[{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
      }, pointerCursor]}>
            <Icon name="logout" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={[type.caption, {
          color: 'rgba(255,255,255,0.6)'
        }]}>{t("Çıkış yap")}</Text>
          </Pressable>
        </View> : <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    }}>
          <Icon name="user" size={14} color={color.onDarkMuted} />
          <Text style={[type.caption, {
        color: color.onDarkMuted
      }]}>{t("Size özel bir değerlendirme")}</Text>
        </View>}
    </View>;
}
function CompactBar({
  store,
  onSheet,
  topInset
}: {
  store: AssessmentState;
  onSheet: (s: SheetName) => void;
  topInset: number;
}) {
  return <View style={[styles.compact, {
    paddingTop: topInset + 12
  }]}>
      <Wordmark size="sm" /><LanguagePicker dark />
      <View style={{
      flex: 1
    }} />
      {store.phase === 'item' && store.item ? <Text style={[type.caption, {
      color: color.onDarkMuted,
      marginRight: 8
    }]}>{skillMeta(store.item.skill).label} · {store.answered}{t(" yanıt")}</Text> : null}
      <IconButton icon="layers" label={t("Dört beceri")} onPress={() => onSheet('skills')} tone="rgba(255,255,255,0.75)" />
      <IconButton icon="help" label={t("Yardım ve destek")} onPress={() => onSheet('help')} tone="rgba(255,255,255,0.75)" />
      {store.candidate ? <IconButton icon="logout" label={t("Çıkış yap")} onPress={() => onSheet('logout')} tone="rgba(255,255,255,0.75)" /> : null}
    </View>;
}
function Footer({
  store
}: {
  store: AssessmentState;
}) {
  return <View style={{
    gap: 8,
    paddingTop: 8
  }}>
      {store.sessionId && store.candidate ? <Text selectable style={{
      fontFamily: font.mono,
      fontSize: 10,
      color: color.muted
    }}>{t("Oturum: ")}{store.sessionId}</Text> : null}
      <View style={{
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap'
    }}>
        <Text style={[type.caption, {
        color: color.muted,
        fontWeight: '700'
      }]}>{t("b4skills")}</Text>
        <Text style={[type.caption, {
        color: color.muted
      }]}>{t("· İngilizcenizi tüm yönleriyle tanıyın.")}</Text>
      </View>
    </View>;
}
function HelpSheet({
  visible,
  onClose
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return <Sheet visible={visible} onClose={onClose} eyebrow={t("Yardım ve destek")} title={t("Nasıl yardımcı olabiliriz?")}>
      <Text style={[type.body, {
      color: color.muted
    }]}>{t("Giriş veya sınav erişimiyle ilgili bir sorun yaşıyorsanız kurumunuzla görüşün. Destek isterken ekranın altındaki oturum kimliğinizi paylaşabilirsiniz.")}</Text>
      <Button label={t("hello@b4skills.com")} icon="mail" variant="secondary" onPress={() => Linking.openURL('mailto:hello@b4skills.com')} />
      <View style={styles.helpNote}>
        <Eyebrow tone={color.muted}>{t("Bu sürümde")}</Eyebrow>
        <Text style={[type.small, {
        color: color.body
      }]}>{t("Çoktan seçmeli, yazılı ve sesli yanıtlar desteklenir. Gözetimli sınavlar, sürükle-bırak ve entegre görevler için web uygulamasını kullanın.")}</Text>
      </View>
    </Sheet>;
}
function ConnectionSheet({
  visible,
  onClose,
  store
}: {
  visible: boolean;
  onClose: () => void;
  store: AssessmentState;
}) {
  const [value, setValue] = useState(store.address);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setValue(store.address);
      setError(null);
    }
  }, [visible, store.address]);
  const save = () => {
    const problem = store.saveAddress(value);
    if (problem) setError(problem);else onClose();
  };
  return <Sheet visible={visible} onClose={onClose} eyebrow={t("Bağlantı")} title={t("Sunucu adresi")}>
      <Field label={t("Sunucu adresi")} icon="globe" value={value} onChangeText={setValue} placeholder={t("https://app.b4skills.com")} keyboardType="url" textContentType="URL" onSubmitEditing={save} returnKeyType="done" />
      <Text style={[type.small, {
      color: color.muted
    }]}>
        {Platform.OS === 'macos' ? t("Bu Mac") : t("Simülatör")}{t(" için geliştirmede http://localhost:3001 kullanılır. Fiziksel iPad'de Mac'in yerel ağ adresini girin. Uzak sunucular HTTPS gerektirir.")}</Text>
      {error ? <Message tone="error" text={error} /> : null}
      <Button label={t("Kaydet")} block onPress={save} />
    </Sheet>;
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: color.canvas
  },
  update: {
    flex: 1,
    backgroundColor: color.aubergine,
    paddingHorizontal: 24
  },
  updateBar: {
    alignItems: 'flex-end'
  },
  rtl: {
    direction: 'rtl'
  },
  ltr: {
    direction: 'ltr'
  },
  updateBody: {
    flex: 1,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 18
  },
  updateTitle: {
    color: color.onDark,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700'
  },
  updateText: {
    color: color.onDarkMuted,
    fontSize: 17,
    lineHeight: 25
  },
  updateBuild: {
    color: color.onDarkMuted,
    fontSize: 13
  },
  loading: {
    paddingVertical: 120,
    alignItems: 'center'
  },
  content: {
    paddingHorizontal: 32,
    alignItems: 'center'
  },
  column: {
    width: '100%',
    maxWidth: 1120,
    gap: 24
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: -8
  },
  sidebar: {
    width: 272,
    backgroundColor: color.navy,
    paddingHorizontal: 22,
    paddingBottom: 28
  },
  tagline: {
    marginTop: 14,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2.2,
    color: 'rgba(255,255,255,0.45)'
  },
  sideRule: {
    height: 1,
    backgroundColor: color.onDarkFaint,
    marginVertical: 26
  },
  sideRuleFooter: {
    height: 1,
    backgroundColor: color.onDarkFaint,
    marginTop: 16,
    marginBottom: 20
  },
  sideScroll: {
    flex: 1,
    marginHorizontal: -22
  },
  sideScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 4
  },
  sideSpacer: {
    flexGrow: 1,
    minHeight: 22
  },
  sideLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 13
  },
  navActive: {
    backgroundColor: color.plum
  },
  navText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.62)'
  },
  navDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.gold
  },
  nowCard: {
    marginTop: 22,
    padding: 16,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(253,224,71,0.25)',
    backgroundColor: 'rgba(253,224,71,0.06)'
  },
  quote: {
    padding: 18,
    gap: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.045)'
  },
  quoteText: {
    fontFamily: font.serif,
    fontSize: 20,
    lineHeight: 26,
    color: color.onDark
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.gold,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: color.navy
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: color.navy
  },
  helpNote: {
    gap: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line
  }
});
