import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { CandidateDetails, normaliseExamCode } from '../api';
import { LOGO, LOGO_ASPECT } from '../assets/logo';
import { Icon } from '../components/Icon';
import { Button, Card, Eyebrow, Field, IconButton, Message } from '../components/ui';
import { color, font, type } from '../theme';
import { AssessmentState } from '../useAssessment';


const newCandidateId = () =>
  `cand_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Opening screen: the logo centred on a plum-dark page, exam-code entry, then email sign-in. */
export function Welcome({ store, onConnection, onHelp }: { store: AssessmentState; onConnection: () => void; onHelp: () => void }) {
  const { width } = useWindowDimensions();
  const logoW = Math.min(560, Math.max(300, width * 0.46), width - 40);
  const logoH = logoW / LOGO_ASPECT;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <View style={styles.column}>
          <View style={styles.brand}>
            <View style={{ width: logoW, height: logoH, alignItems: 'center', justifyContent: 'center' }}>
              {/* Soft magenta halo centred on the logo: stacked low-opacity discs, no gradient dependency. */}
              {[2.3, 1.95, 1.65, 1.4, 1.2, 1.02, 0.86].map(k => (
                <View key={k} pointerEvents="none" style={[styles.glow, { width: logoW * k, height: logoW * k, borderRadius: (logoW * k) / 2 }]} />
              ))}
              <Image source={LOGO} style={{ width: logoW, height: logoH }} resizeMode="contain" accessibilityLabel="b4skills" accessibilityRole="image" />
            </View>
            <Text style={styles.tagline}>ENGLISH ASSESSMENT</Text>
          </View>

          {store.restoring ? (
            <ActivityIndicator color={color.onDark} style={{ marginTop: 24 }} />
          ) : (
            <>
              <CodeCard store={store} />
              <View style={styles.divider} accessibilityRole="text">
                <View style={styles.rule} />
                <Text style={styles.dividerText}>veya hesabınızla giriş yapın</Text>
                <View style={styles.rule} />
              </View>
              <AccountCard store={store} />
              <View style={styles.footer}>
                <Button label="Sunucu" icon="sliders" variant="onDark" compact onPress={onConnection} />
                <Button label="Yardım" icon="help" variant="onDark" compact onPress={onHelp} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Exam-code entry, mirroring the web's CodeEntryPage: validate (read-only), then candidate details
 * and redeem. When a candidate is already signed in, their account is used and no form is shown.
 */
export function CodeCard({ store, signedIn = false }: { store: AssessmentState; signedIn?: boolean }) {
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState<{ code: string; productLine: string } | null>(null);
  const [details, setDetails] = useState<CandidateDetails>({ name: '', surname: '', email: '', school: '', className: '' });
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const candidateId = useRef<string | null>(null);
  const normalised = normaliseExamCode(code);

  const verify = async () => {
    if (checking || normalised.length < 4) return;
    setError(null);
    setChecking(true);
    try {
      setVerified(await store.checkCode(normalised));
    } catch (e) {
      setError(message(e));
    } finally {
      setChecking(false);
    }
  };

  const reset = () => { setVerified(null); setError(null); candidateId.current = null; };

  const redeem = async () => {
    if (!verified) return;
    setError(null);
    const own = store.candidate;
    const payload: CandidateDetails = signedIn && own
      ? { email: own.email, name: (own.displayName ?? '').split(' ')[0] ?? '', surname: (own.displayName ?? '').split(' ').slice(1).join(' '), school: '', className: '' }
      : {
          name: details.name.trim(), surname: details.surname.trim(), email: details.email.trim().toLowerCase(),
          school: details.school.trim(), className: details.className.trim(),
        };
    if (!signedIn && Object.values(payload).some(v => !v)) {
      setError('Lütfen tüm aday bilgilerini doldurun.');
      return;
    }
    if (!signedIn && !/^\S+@\S+\.\S+$/.test(payload.email)) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }
    // Reuse one id for retries of this attempt so a lost response cannot create a second candidate.
    candidateId.current ??= newCandidateId();
    try {
      await store.redeemCode(verified.code, candidateId.current, payload);
    } catch (e) {
      setError(e instanceof TypeError
        ? 'Bağlantı kesildi. Bilgileriniz duruyor; bağlantınızı kontrol edip tekrar deneyin. Kodunuz kullanılmış görünürse kurumunuzla iletişime geçin.'
        : message(e));
    }
  };

  const set = (key: keyof CandidateDetails) => (value: string) => setDetails(d => ({ ...d, [key]: value }));

  return (
    <Card style={styles.card}>
      <View style={{ gap: 20 }}>
        <View style={styles.cardHeader}>
          <View style={styles.badge}><Icon name="hash" size={20} color={color.plum} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Eyebrow>{verified ? 'Adım 2 / 2 · Aday bilgileri' : 'Adım 1 / 2 · Kodu doğrula'}</Eyebrow>
            <Text style={[type.heading, { color: color.ink, fontSize: 21 }]}>{verified ? 'Bilgilerinizi girin' : 'Sınav kodunuz var mı?'}</Text>
          </View>
          {verified ? <IconButton icon="close" label="Kodu değiştir" onPress={reset} /> : null}
        </View>

        {!verified ? (
          <>
            <Text style={[type.small, { color: color.muted }]}>Kurumunuzun verdiği sınav kodunu girin.</Text>
            <View style={styles.codeBox}>
            <TextInput
              accessibilityLabel="Sınav kodu"
              value={code}
              onChangeText={t => setCode(t.toUpperCase())}
              placeholder="SINAV KODU"
              placeholderTextColor={color.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              maxLength={64}
              returnKeyType="go"
              onSubmitEditing={verify}
              editable={!checking}
              style={styles.codeInput}
            />
            </View>
            <Button label="Kodu doğrula" trailingIcon="arrowRight" block onPress={verify} loading={checking}
              disabled={normalised.length < 4} />
          </>
        ) : (
          <>
            <View style={styles.product}>
              <Text style={[type.caption, { color: color.plum, fontWeight: '700' }]}>Değerlendirmeniz</Text>
              <Text style={[type.body, { color: color.ink, fontWeight: '600' }]}>{verified.productLine}</Text>
              <Text style={[type.caption, { color: color.muted, fontFamily: font.mono }]}>{verified.code}</Text>
            </View>
            {signedIn ? (
              <Text style={[type.small, { color: color.muted }]}>
                Kod {store.candidate?.email} hesabınıza tanımlanacak. Kod bir kez kullanılabilir.
              </Text>
            ) : (
              <View style={{ gap: 14 }}>
                <View style={styles.pair}>
                  <View style={{ flex: 1 }}><Field label="Ad" icon="user" value={details.name} onChangeText={set('name')} textContentType="givenName" autoComplete="given-name" autoCapitalize="words" /></View>
                  <View style={{ flex: 1 }}><Field label="Soyad" icon="user" value={details.surname} onChangeText={set('surname')} textContentType="familyName" autoComplete="family-name" autoCapitalize="words" /></View>
                </View>
                <Field label="E-posta adresi" icon="mail" value={details.email} onChangeText={set('email')} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
                <View style={styles.pair}>
                  <View style={{ flex: 1.4 }}><Field label="Okul / Kurum" icon="book" value={details.school} onChangeText={set('school')} textContentType="organizationName" autoCapitalize="words" /></View>
                  <View style={{ flex: 1 }}><Field label="Sınıf / Düzey" icon="layers" value={details.className} onChangeText={set('className')} autoCapitalize="characters" /></View>
                </View>
              </View>
            )}
            <Button label={signedIn ? 'Kodu kullan' : 'Kaydol ve devam et'} trailingIcon="arrowRight" block onPress={redeem} loading={store.busy} />
          </>
        )}
        {error ? <Message tone="error" text={error} /> : null}
      </View>
    </Card>
  );
}

function AccountCard({ store }: { store: AssessmentState }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const canSubmit = email.trim().length > 3 && password.length > 0 && !store.busy;
  const submit = () => { if (canSubmit) store.login(email, password).then(() => setPassword('')); };

  return (
    <Card style={styles.card}>
      <View style={{ gap: 18 }}>
        <View style={styles.cardHeader}>
          <View style={styles.badge}><Icon name="user" size={20} color={color.plum} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Eyebrow>Hesabınız</Eyebrow>
            <Text style={[type.heading, { color: color.ink, fontSize: 21 }]}>E-posta ile giriş</Text>
          </View>
        </View>
        <Field label="E-posta adresi" icon="mail" value={email} onChangeText={setEmail} placeholder="ornek@eposta.com"
          keyboardType="email-address" textContentType="username" autoComplete="email" returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()} />
        <Field ref={passwordRef} label="Şifre" icon="lock" value={password} onChangeText={setPassword} placeholder="Şifrenizi girin"
          secureTextEntry textContentType="password" autoComplete="password" returnKeyType="go" onSubmitEditing={submit} />
        <Button label="Giriş yap" trailingIcon="arrowRight" block onPress={submit} disabled={!canSubmit} loading={store.busy} />
        {store.error ? <Message tone="error" text={store.error} onDismiss={() => store.setError(null)} /> : null}
        <View style={styles.row}>
          <Icon name="shield" size={14} color={color.plum} />
          <Text style={[type.caption, { color: color.muted }]}>Şifreniz bu cihazda saklanmaz.</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.aubergine, overflow: 'hidden' },
  glow: { position: 'absolute', backgroundColor: color.logoMagenta, opacity: 0.045 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 56 },
  column: { width: '100%', maxWidth: 480, gap: 22, alignItems: 'stretch' },
  brand: { alignItems: 'center', gap: 22, marginBottom: 18 },
  tagline: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', letterSpacing: 3 },
  card: { padding: 26, borderColor: 'transparent', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, shadowColor: '#000' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: { width: 44, height: 44, borderRadius: 13, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
  // The box owns height and border; the input is centred inside it. Vertical padding on a
  // single-line macOS input makes react-native-macos 0.83 quit silently, so none is used.
  codeBox: {
    height: 64, borderRadius: 14, borderWidth: 1, borderColor: color.line, backgroundColor: color.canvas,
    justifyContent: 'center', paddingHorizontal: 12,
  },
  codeInput: {
    textAlign: 'center', fontSize: 24, fontFamily: font.mono, letterSpacing: 5, color: color.ink, fontWeight: '600',
  },
  product: { padding: 16, gap: 4, borderRadius: 14, backgroundColor: color.wash, borderWidth: 1, borderColor: '#EBD3E2' },
  pair: { flexDirection: 'row', gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 2 },
  rule: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
  dividerText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
