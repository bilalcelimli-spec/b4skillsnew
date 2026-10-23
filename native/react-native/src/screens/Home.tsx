import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Eyebrow, Field, Message, SkillTile } from '../components/ui';
import { Icon } from '../components/Icon';
import { color, font, SKILLS, type } from '../theme';
import { AssessmentState } from '../useAssessment';
import { formatSeconds, RecorderState } from '../useRecorder';

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function SkillGrid() {
  // Four across when there is room, otherwise a balanced 2×2 — never a 3+1 orphan.
  const [width, setWidth] = useState(0);
  const columns = width >= 820 ? 4 : 2;
  const tileWidth = width ? (width - 14 * (columns - 1)) / columns : undefined;
  return (
    <View style={styles.grid} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {(['READING', 'LISTENING', 'WRITING', 'SPEAKING'] as const).map(key => (
        <SkillTile key={key} title={SKILLS[key].label} subtitle={SKILLS[key].hint} icon={SKILLS[key].icon}
          style={tileWidth ? { width: tileWidth, flexGrow: 0, flexBasis: 'auto' } : undefined} />
      ))}
    </View>
  );
}

export function SignIn({ store, wide, onConnection }: { store: AssessmentState; wide: boolean; onConnection: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const canSubmit = email.trim().length > 3 && password.length > 0 && !store.busy;
  const submit = () => { if (canSubmit) store.login(email, password).then(() => setPassword('')); };

  return (
    <View style={{ gap: 32 }}>
      <View style={[styles.hero, wide && styles.heroWide]}>
        <View style={[styles.story, wide && { flex: 1 }]}>
          <Eyebrow>Dört beceri. Tek bir bakış.</Eyebrow>
          <Text style={[type.display, { color: color.ink }]}>
            İngilizceniz.{'\n'}<Text style={{ color: color.plum }}>Tüm yönleriyle.</Text>
          </Text>
          <Text style={[type.body, { color: color.muted, maxWidth: 460 }]}>
            Okuyun, dinleyin, yazın ve konuşun. Seviyenize uyum sağlayan bir değerlendirmeyle kendinizi daha iyi tanıyın.
          </Text>
          <View style={{ gap: 12, marginTop: 8 }}>
            <View style={styles.row}>
              <Icon name="target" size={16} color={color.plum} />
              <Text style={[type.small, { color: color.ink, fontWeight: '600' }]}>CEFR odaklı uyarlanabilir değerlendirme</Text>
            </View>
            <View style={styles.ladder} accessible accessibilityLabel="CEFR düzeyleri A1, A2, B1, B2, C1, C2">
              {CEFR.map((level, i) => (
                <View key={level} style={[styles.rung, { backgroundColor: i === 5 ? color.plum : color.wash, height: 30 + i * 6 }]}>
                  <Text style={[styles.rungText, i === 5 && { color: color.onDark }]}>{level}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Card style={[styles.login, wide && { width: 380 }]}>
          <View style={{ gap: 22 }}>
            <View style={styles.rowBetween}>
              <Eyebrow>Hoş geldiniz</Eyebrow>
              <Icon name="user" size={20} color={color.plum} />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={[type.heading, { color: color.ink, fontSize: 26, lineHeight: 32 }]}>Kaldığınız yerden{'\n'}devam edin.</Text>
              <Text style={[type.small, { color: color.muted }]}>Kurumunuzun verdiği B4Skills hesabıyla giriş yapın.</Text>
            </View>
            <View style={{ gap: 16 }}>
              <Field
                label="E-posta adresi" icon="mail" value={email} onChangeText={setEmail}
                placeholder="ornek@eposta.com" keyboardType="email-address" textContentType="username"
                autoComplete="email" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <Field
                ref={passwordRef}
                label="Şifre" icon="lock" value={password} onChangeText={setPassword} placeholder="Şifrenizi girin"
                secureTextEntry textContentType="password" autoComplete="password" returnKeyType="go" onSubmitEditing={submit}
              />
            </View>
            <Button label="Giriş yap" trailingIcon="arrowRight" block onPress={submit} disabled={!canSubmit} loading={store.busy} />
            <View style={styles.rowBetween}>
              <View style={[styles.row, { flex: 1 }]}>
                <Icon name="shield" size={14} color={color.plum} />
                <Text style={[type.caption, { color: color.muted, flex: 1 }]}>Şifreniz bu cihazda saklanmaz.</Text>
              </View>
              <Button label="Sunucu" icon="sliders" variant="ghost" compact onPress={onConnection} />
            </View>
          </View>
        </Card>
      </View>
      <SkillGrid />
    </View>
  );
}

export function Ready({ store, recorder, wide }: { store: AssessmentState; recorder: RecorderState; wide: boolean }) {
  const [sessionInput, setSessionInput] = useState(store.sessionId);
  const firstName = (store.candidate?.displayName ?? '').split(' ')[0];
  const meter = Array.from({ length: 24 }, (_, i) => {
    const centre = 1 - Math.abs(i - 11.5) / 12;
    return Math.max(0.08, Math.min(1, recorder.level * (0.55 + centre * 0.9) * (0.75 + ((i * 37) % 10) / 40)));
  });

  return (
    <View style={{ gap: 26 }}>
      <View style={{ gap: 12 }}>
        <Eyebrow>Size özel bir başlangıç</Eyebrow>
        <Text style={[type.title, { color: color.ink, fontSize: 38, lineHeight: 44 }]}>
          {firstName ? `Hazır olduğunuzda başlayalım, ${firstName}.` : 'Hazır olduğunuzda başlayalım.'}
        </Text>
        <Text style={[type.body, { color: color.muted }]}>Sessiz bir ortam seçin. Kulaklığınızı ve mikrofonunuzu hazırlayın.</Text>
      </View>

      <View style={[styles.hero, wide && styles.heroWide, { alignItems: 'stretch' }]}>
        <Card style={wide ? { flex: 1.35 } : undefined}>
          <View style={{ gap: 22 }}>
            <View style={styles.rowBetween}>
              <View style={{ gap: 8, flex: 1 }}>
                <Eyebrow>Değerlendirme programınız</Eyebrow>
                <Text style={[type.heading, { color: color.ink, fontSize: 26 }]}>{store.productLine}</Text>
              </View>
              <View style={styles.badge}><Icon name="layers" size={22} color={color.plum} /></View>
            </View>
            <Text style={[type.small, { color: color.muted }]}>
              Sorular yanıtlarınıza göre ilerler. Bölüm sırası ve süre, kurumunuzun programına bağlıdır. Başladıktan sonra oturum sunucuda işlemeye devam eder.
            </Text>
            <View style={styles.checklist}>
              {['Sessiz bir ortam', 'Kulaklık veya hoparlör', 'Çalışan bir mikrofon'].map(line => (
                <View key={line} style={styles.row}>
                  <Icon name="check" size={15} color={color.success} />
                  <Text style={[type.small, { color: color.body }]}>{line}</Text>
                </View>
              ))}
            </View>
            <Button
              label="Değerlendirmeye başla" trailingIcon="arrowRight" block loading={store.busy}
              disabled={recorder.recording}
              onPress={() => { recorder.clear(); store.launch(); }}
            />
          </View>
        </Card>

        <Card style={wide ? { flex: 1 } : undefined}>
          <View style={{ gap: 18 }}>
            <View style={styles.rowBetween}>
              <Eyebrow>Cihaz kontrolü</Eyebrow>
              <Icon name="mic" size={18} color={color.plum} />
            </View>
            <Text style={[type.heading, { color: color.ink, fontSize: 20 }]}>Mikrofonunuzu deneyin</Text>
            <View style={styles.meter} accessible accessibilityLabel={recorder.recording ? 'Ses seviyesi ölçülüyor' : 'Ses seviyesi göstergesi'}>
              {meter.map((h, i) => (
                <View key={i} style={[styles.meterBar, { height: `${h * 100}%`, backgroundColor: recorder.recording ? color.plum : color.line }]} />
              ))}
            </View>
            <Text style={[type.caption, { color: color.muted }]}>
              {recorder.recording
                ? `Konuşun, çubuklar hareket etmeli · ${formatSeconds(recorder.seconds)}`
                : recorder.clip ? 'Mikrofonunuz ses alıyor. Deneme kaydı gönderilmez.' : 'Birkaç saniye konuşun. Deneme kaydı gönderilmez.'}
            </Text>
            <Button
              label={recorder.recording ? 'Denemeyi bitir' : recorder.clip ? 'Tekrar dene' : 'Mikrofonu kontrol et'}
              icon={recorder.recording ? 'stop' : 'mic'} variant="secondary" block loading={recorder.preparing}
              onPress={() => (recorder.recording ? recorder.stop() : recorder.start())}
            />
            {recorder.clip && !recorder.recording ? <Message tone="success" text="Kayıt alındı." /> : null}
            {recorder.error ? <Message tone="error" text={recorder.error} /> : null}
          </View>
        </Card>
      </View>

      <Card>
        <View style={[styles.hero, wide && styles.heroWide, { gap: 22 }]}>
          <View style={[{ gap: 8 }, wide && { flex: 1 }]}>
            <Text style={[type.heading, { color: color.ink, fontSize: 18 }]}>Başladığınız bir oturum mu var?</Text>
            <Text style={[type.small, { color: color.muted }]}>Oturum kimliğinizle değerlendirmenize veya sonuçlarınıza ulaşın.</Text>
          </View>
          <View style={[{ gap: 12 }, wide && { flex: 1.2 }]}>
            <Field label="Oturum kimliği" icon="hash" value={sessionInput} onChangeText={setSessionInput}
              placeholder="Oturum kimliğinizi girin" style={{ fontFamily: font.mono, fontSize: 13 }}
              onSubmitEditing={() => store.resume(sessionInput)} returnKeyType="go" />
            <Button label="Oturuma devam et" trailingIcon="arrowRight" variant="secondary"
              disabled={!sessionInput.trim() || recorder.recording || store.busy}
              onPress={() => { recorder.clear(); store.resume(sessionInput); }} />
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  hero: { gap: 28 },
  heroWide: { flexDirection: 'row', alignItems: 'center' },
  story: { gap: 20, paddingVertical: 8 },
  login: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ladder: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  rung: { width: 46, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rungText: { fontSize: 11, fontWeight: '700', color: color.plum },
  badge: { width: 54, height: 54, borderRadius: 16, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
  checklist: { gap: 10, padding: 16, borderRadius: 14, backgroundColor: color.canvas },
  meter: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  meterBar: { flex: 1, borderRadius: 3, minHeight: 4 },
});
