import { Text } from "../i18n/Text";
import { t } from "../i18n/core";
// Sign-in cards: exam-code entry (as on the web's CodeEntryPage) and email/password.
import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { CandidateDetails, normaliseExamCode } from '../api';
import { Icon } from '../components/Icon';
import { Button, Card, Eyebrow, Field, IconButton, Message } from '../components/ui';
import { color, font, type } from '../theme';
import { AssessmentState } from '../useAssessment';
const newCandidateId = () => `cand_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
const message = (e: unknown) => e instanceof Error ? e.message : String(e);

/**
 * Exam-code entry, mirroring the web's CodeEntryPage: validate (read-only), then candidate details
 * and redeem. When a candidate is already signed in, their account is used and no form is shown.
 */
export function CodeCard({
  store,
  signedIn = false,
  autoFocus = false
}: {
  store: AssessmentState;
  signedIn?: boolean;
  autoFocus?: boolean;
}) {
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState<{
    code: string;
    productLine: string;
  } | null>(null);
  const [details, setDetails] = useState<CandidateDetails>({
    name: '',
    surname: '',
    email: '',
    school: '',
    className: ''
  });
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
  const reset = () => {
    setVerified(null);
    setError(null);
    candidateId.current = null;
  };
  const redeem = async () => {
    if (!verified) return;
    setError(null);
    const own = store.candidate;
    const payload: CandidateDetails = signedIn && own ? {
      email: own.email,
      name: (own.displayName ?? '').split(' ')[0] ?? '',
      surname: (own.displayName ?? '').split(' ').slice(1).join(' '),
      school: '',
      className: ''
    } : {
      name: details.name.trim(),
      surname: details.surname.trim(),
      email: details.email.trim().toLowerCase(),
      school: details.school.trim(),
      className: details.className.trim()
    };
    if (!signedIn && Object.values(payload).some(v => !v)) {
      setError("Lütfen tüm aday bilgilerini doldurun.");
      return;
    }
    if (!signedIn && !/^\S+@\S+\.\S+$/.test(payload.email)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    // Reuse one id for retries of this attempt so a lost response cannot create a second candidate.
    candidateId.current ??= newCandidateId();
    try {
      await store.redeemCode(verified.code, candidateId.current, payload);
    } catch (e) {
      setError(e instanceof TypeError ? "Bağlantı kesildi. Bilgileriniz duruyor; bağlantınızı kontrol edip tekrar deneyin. Kodunuz kullanılmış görünürse kurumunuzla iletişime geçin." : message(e));
    }
  };
  const set = (key: keyof CandidateDetails) => (value: string) => setDetails(d => ({
    ...d,
    [key]: value
  }));
  return <Card style={styles.card}>
      <View style={{
      gap: 20
    }}>
        <View style={styles.cardHeader}>
          <View style={styles.badge}><Icon name="hash" size={20} color={color.plum} /></View>
          <View style={{
          flex: 1,
          gap: 4
        }}>
            <Eyebrow>{verified ? t("Adım 2 / 2 · Aday bilgileri") : t("Adım 1 / 2 · Kodu doğrula")}</Eyebrow>
            <Text style={[type.heading, {
            color: color.ink,
            fontSize: 21
          }]}>{verified ? t("Bilgilerinizi girin") : t("Sınav kodunuz var mı?")}</Text>
          </View>
          {verified ? <IconButton icon="close" label={t("Kodu değiştir")} onPress={reset} /> : null}
        </View>

        {!verified ? <>
            <Text style={[type.small, {
          color: color.muted
        }]}>{t("Kurumunuzun verdiği sınav kodunu girin.")}</Text>
            <View style={styles.codeBox}>
            <TextInput accessibilityLabel={t("Sınav kodu")} autoFocus={autoFocus} value={code} onChangeText={value => setCode(value.toUpperCase())} placeholder={t("SINAV KODU")} placeholderTextColor={color.faint} autoCapitalize="characters" autoCorrect={false} spellCheck={false} autoComplete="off" maxLength={64} returnKeyType="go" onSubmitEditing={verify} editable={!checking} style={[styles.codeInput, { direction: "ltr", writingDirection: "ltr", textAlign: "left" }]} />
            </View>
            <Button label={t("Kodu doğrula")} trailingIcon="arrowRight" block onPress={verify} loading={checking} disabled={normalised.length < 4} />
          </> : <>
            <View style={styles.product}>
              <Text style={[type.caption, {
            color: color.plum,
            fontWeight: '700'
          }]}>{t("Değerlendirmeniz")}</Text>
              <Text style={[type.body, {
            color: color.ink,
            fontWeight: '600'
          }]}>{verified.productLine}</Text>
              <Text style={[type.caption, {
            color: color.muted,
            fontFamily: font.mono
          }]}>{verified.code}</Text>
            </View>
            {signedIn ? <Text style={[type.small, {
          color: color.muted
        }]}>{t("Kod ")}{store.candidate?.email}{t(" hesabınıza tanımlanacak. Kod bir kez kullanılabilir.")}</Text> : <View style={{
          gap: 14
        }}>
                <View style={styles.pair}>
                  <View style={{
              flex: 1
            }}><Field label={t("Ad")} icon="user" value={details.name} onChangeText={set('name')} textContentType="givenName" autoComplete="given-name" autoCapitalize="words" /></View>
                  <View style={{
              flex: 1
            }}><Field label={t("Soyad")} icon="user" value={details.surname} onChangeText={set('surname')} textContentType="familyName" autoComplete="family-name" autoCapitalize="words" /></View>
                </View>
                <Field label={t("E-posta adresi")} icon="mail" value={details.email} onChangeText={set('email')} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
                <View style={styles.pair}>
                  <View style={{
              flex: 1.4
            }}><Field label={t("Okul / Kurum")} icon="book" value={details.school} onChangeText={set('school')} textContentType="organizationName" autoCapitalize="words" /></View>
                  <View style={{
              flex: 1
            }}><Field label={t("Sınıf / Düzey")} icon="layers" value={details.className} onChangeText={set('className')} autoCapitalize="characters" /></View>
                </View>
              </View>}
            <Button label={signedIn ? t("Kodu kullan") : t("Kaydol ve devam et")} trailingIcon="arrowRight" block onPress={redeem} loading={store.busy} />
          </>}
        {error ? <Message tone="error" text={error} /> : null}
      </View>
    </Card>;
}
export function AccountCard({
  store,
  autoFocus = false,
  showHeader = true
}: {
  store: AssessmentState;
  autoFocus?: boolean;
  showHeader?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const canSubmit = email.trim().length > 3 && password.length > 0 && !store.busy;
  const submit = () => {
    if (canSubmit) store.login(email, password).then(() => setPassword(''));
  };
  return <Card style={styles.card}>
      <View style={{
      gap: 18
    }}>
        {showHeader ? <View style={styles.cardHeader}>
            <View style={styles.badge}><Icon name="user" size={20} color={color.plum} /></View>
            <View style={{
          flex: 1,
          gap: 4
        }}>
              <Eyebrow>{t("Hesabınız")}</Eyebrow>
              <Text style={[type.heading, {
            color: color.ink,
            fontSize: 21
          }]}>{t("E-posta ile giriş")}</Text>
            </View>
          </View> : null}
        <Field label={t("E-posta adresi")} icon="mail" value={email} onChangeText={setEmail} placeholder={t("ornek@eposta.com")} autoFocus={autoFocus} keyboardType="email-address" textContentType="username" autoComplete="email" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
        <Field ref={passwordRef} label={t("Şifre")} icon="lock" value={password} onChangeText={setPassword} placeholder={t("Şifrenizi girin")} secureTextEntry textContentType="password" autoComplete="password" returnKeyType="go" onSubmitEditing={submit} />
        <Button label={t("Giriş yap")} trailingIcon="arrowRight" block onPress={submit} disabled={!canSubmit} loading={store.busy} />
        {store.error ? <Message tone="error" text={store.error} onDismiss={() => store.setError(null)} /> : null}
        <View style={styles.row}>
          <Icon name="shield" size={14} color={color.plum} />
          <Text style={[type.caption, {
          color: color.muted
        }]}>{t("Şifreniz bu cihazda saklanmaz.")}</Text>
        </View>
      </View>
    </Card>;
}
const styles = StyleSheet.create({
  card: {
    padding: 26,
    borderColor: 'transparent',
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: {
      width: 0,
      height: 14
    },
    shadowColor: '#000'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // The box owns height and border; the input is centred inside it. Vertical padding on a
  // single-line macOS input makes react-native-macos 0.83 quit silently, so none is used.
  codeBox: {
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.canvas,
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontFamily: font.mono,
    letterSpacing: 5,
    color: color.ink,
    fontWeight: '600'
  },
  product: {
    padding: 16,
    gap: 4,
    borderRadius: 14,
    backgroundColor: color.wash,
    borderWidth: 1,
    borderColor: '#EBD3E2'
  },
  pair: {
    flexDirection: 'row',
    gap: 12
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  }
});
