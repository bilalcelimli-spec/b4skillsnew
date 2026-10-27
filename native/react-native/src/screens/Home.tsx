import { Text } from "../i18n/Text";
import { t } from "../i18n/core";
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Eyebrow, Field, Message, SkillTile } from '../components/ui';
import { Icon } from '../components/Icon';
import { color, font, skillMeta, type } from '../theme';
import { AssessmentState } from '../useAssessment';
import { formatSeconds, RecorderState } from '../useRecorder';
import { CodeCard } from './SignInCards';
export function SkillGrid() {
  // Four across when there is room, otherwise a balanced 2×2 — never a 3+1 orphan.
  const [width, setWidth] = useState(0);
  const columns = width >= 820 ? 4 : 2;
  const tileWidth = width ? (width - 14 * (columns - 1)) / columns : undefined;
  return <View style={styles.grid} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {(['READING', 'LISTENING', 'WRITING', 'SPEAKING'] as const).map(key => <SkillTile key={key} title={skillMeta(key).label} subtitle={skillMeta(key).hint} icon={skillMeta(key).icon} style={tileWidth ? {
      width: tileWidth,
      flexGrow: 0,
      flexBasis: 'auto'
    } : undefined} />)}
    </View>;
}
export function Ready({
  store,
  recorder,
  wide
}: {
  store: AssessmentState;
  recorder: RecorderState;
  wide: boolean;
}) {
  const [sessionInput, setSessionInput] = useState(store.sessionId);
  const firstName = (store.candidate?.displayName ?? '').split(' ')[0];
  const meter = Array.from({
    length: 24
  }, (_, i) => {
    const centre = 1 - Math.abs(i - 11.5) / 12;
    return Math.max(0.08, Math.min(1, recorder.level * (0.55 + centre * 0.9) * (0.75 + i * 37 % 10 / 40)));
  });
  return <View style={{
    gap: 26
  }}>
      <View style={{
      gap: 12
    }}>
        <Eyebrow>{t("Size özel bir başlangıç")}</Eyebrow>
        <Text style={[type.title, {
        color: color.ink,
        fontSize: 38,
        lineHeight: 44
      }]}>
          {firstName ? t("Hazır olduğunuzda başlayalım, {0}.", [firstName]) : t("Hazır olduğunuzda başlayalım.")}
        </Text>
        <Text style={[type.body, {
        color: color.muted
      }]}>{t("Sessiz bir ortam seçin. Kulaklığınızı ve mikrofonunuzu hazırlayın.")}</Text>
      </View>

      <View style={[styles.hero, wide && styles.heroWide, {
      alignItems: 'stretch'
    }]}>
        <Card style={wide ? {
        flex: 1.35
      } : undefined}>
          <View style={{
          gap: 22
        }}>
            <View style={styles.rowBetween}>
              <View style={{
              gap: 8,
              flex: 1
            }}>
                <Eyebrow>{t("Değerlendirme programınız")}</Eyebrow>
                <Text style={[type.heading, {
                color: color.ink,
                fontSize: 26
              }]}>{store.productLine}</Text>
              </View>
              <View style={styles.badge}><Icon name="layers" size={22} color={color.plum} /></View>
            </View>
            <Text style={[type.small, {
            color: color.muted
          }]}>{t("Sorular yanıtlarınıza göre ilerler. Bölüm sırası ve süre, kurumunuzun programına bağlıdır. Başladıktan sonra oturum sunucuda işlemeye devam eder.")}</Text>
            <View style={styles.checklist}>
              {[t("Sessiz bir ortam"), t("Kulaklık veya hoparlör"), t("Çalışan bir mikrofon")].map(line => <View key={line} style={styles.row}>
                  <Icon name="check" size={15} color={color.success} />
                  <Text style={[type.small, {
                color: color.body
              }]}>{line}</Text>
                </View>)}
            </View>
            <Button label={t("Sınav koşullarını ve cihazı kontrol et")} variant="secondary" block disabled={recorder.recording || recorder.preparing || store.busy} onPress={store.prepareExam} />
            {store.preparationStep ? <Message text={store.preparationStep} /> : null}
            {store.policy ? <View style={{
            gap: 12
          }}>
              <Text style={[type.small, {
              color: color.body
            }]}>{t(store.policy.disclosure)}</Text>
              <Text style={[type.caption, {
              color: color.muted
            }]}>{t("Profil: ")}{{
                standard: t("Standart"),
                monitored: t("Otomatik gözetimli"),
                secure: t("Güvenli değerlendirme")
              }[store.policy.mode]}{t(" · Uygulama geçiş kaydı: ")}{store.policy.required.lifecycleEvents ? t("açık") : t("kapalı")}.</Text>
              {store.deviceChecks ? <Text style={[type.caption, {
              color: color.muted
            }]}>{t("Mikrofon: ")}{store.deviceChecks.microphone ? t("hazır") : t("izin gerekli")}{t(" · Teknik olay kaydı: ")}{store.deviceChecks.durableEvents ? t("hazır") : t("kullanılamıyor")}
              </Text> : null}
              {store.capabilityProblems.length ? <Message tone="error" text={t("Eksik yetenekler: {0}. Bu profil için sınav başlatılamaz.", [store.capabilityProblems.map(problem => t(problem)).join(', ')])} /> : null}
              <Pressable accessibilityRole="checkbox" accessibilityState={{
              checked: store.policyAccepted
            }} onPress={() => store.setPolicyAccepted(!store.policyAccepted)} style={{
              paddingVertical: 12
            }}>
                <Text style={[type.small, {
                color: color.plum
              }]}>{store.policyAccepted ? '☑' : '☐'}{t(" Sınav koşullarını ve veri kullanım açıklamasını okudum.")}</Text>
              </Pressable>
            </View> : null}
            <Button label={t("Değerlendirmeye başla")} trailingIcon="arrowRight" block loading={store.busy} disabled={recorder.recording || recorder.preparing || !store.canLaunch} onPress={() => {
            recorder.clear();
            store.launch();
          }} />
          </View>
        </Card>

        <Card style={wide ? {
        flex: 1
      } : undefined}>
          <View style={{
          gap: 18
        }}>
            <View style={styles.rowBetween}>
              <Eyebrow>{t("Cihaz kontrolü")}</Eyebrow>
              <Icon name="mic" size={18} color={color.plum} />
            </View>
            <Text style={[type.heading, {
            color: color.ink,
            fontSize: 20
          }]}>{t("Mikrofonunuzu deneyin")}</Text>
            <View style={styles.meter} accessible accessibilityLabel={recorder.recording ? t("Ses seviyesi ölçülüyor") : t("Ses seviyesi göstergesi")}>
              {meter.map((h, i) => <View key={i} style={[styles.meterBar, {
              height: `${h * 100}%`,
              backgroundColor: recorder.recording ? color.plum : color.line
            }]} />)}
            </View>
            <Text style={[type.caption, {
            color: color.muted
          }]}>
              {recorder.recording ? t("Konuşun, çubuklar hareket etmeli · {0}", [formatSeconds(recorder.seconds)]) : recorder.clip ? t("Mikrofonunuz ses alıyor. Deneme kaydı gönderilmez.") : t("Birkaç saniye konuşun. Deneme kaydı gönderilmez.")}
            </Text>
            <Button label={recorder.recording ? t("Denemeyi bitir") : recorder.clip ? t("Tekrar dene") : t("Mikrofonu kontrol et")} icon={recorder.recording ? 'stop' : 'mic'} variant="secondary" block loading={recorder.preparing} onPress={() => recorder.recording ? recorder.stop() : recorder.start()} />
            {recorder.clip && !recorder.recording ? <Message tone="success" text={t("Kayıt alındı.")} /> : null}
            {recorder.error ? <Message tone="error" text={recorder.error} /> : null}
          </View>
        </Card>
      </View>

      <CodeCard store={store} signedIn />

      <Card>
        <View style={[styles.hero, wide && styles.heroWide, {
        gap: 22
      }]}>
          <View style={[{
          gap: 8
        }, wide && {
          flex: 1
        }]}>
            <Text style={[type.heading, {
            color: color.ink,
            fontSize: 18
          }]}>{t("Başladığınız bir oturum mu var?")}</Text>
            <Text style={[type.small, {
            color: color.muted
          }]}>{t("Oturum kimliğinizle değerlendirmenize veya sonuçlarınıza ulaşın.")}</Text>
          </View>
          <View style={[{
          gap: 12
        }, wide && {
          flex: 1.2
        }]}>
            <Field label={t("Oturum kimliği")} icon="hash" value={sessionInput} onChangeText={setSessionInput} placeholder={t("Oturum kimliğinizi girin")} style={{
            fontFamily: font.mono,
            fontSize: 13
          }} onSubmitEditing={() => store.resume(sessionInput)} returnKeyType="go" />
            <Button label={t("Oturuma devam et")} trailingIcon="arrowRight" variant="secondary" disabled={!sessionInput.trim() || recorder.recording || store.busy} onPress={() => {
            recorder.clear();
            store.resume(sessionInput);
          }} />
          </View>
        </View>
      </Card>
    </View>;
}
const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  hero: {
    gap: 28
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  story: {
    gap: 20,
    paddingVertical: 8
  },
  login: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  ladder: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6
  },
  rung: {
    width: 46,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rungText: {
    fontSize: 11,
    fontWeight: '700',
    color: color.plum
  },
  badge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checklist: {
    gap: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: color.canvas
  },
  meter: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4
  },
  meterBar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 4
  }
});
