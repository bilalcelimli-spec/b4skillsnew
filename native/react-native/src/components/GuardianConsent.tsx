import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Backend, ConsentState } from '../api';
import { Text } from '../i18n/Text';
import { t } from '../i18n/core';
import { Button, Card, Field, Message } from './ui';
import { LegalLinks } from './LegalLinks';
import { color, type } from '../theme';

export function GuardianConsentGate({ backend, children }: { backend: Backend; children: React.ReactNode }) {
  const [state, setState] = useState<ConsentState | null>(null);
  const [email, setEmail] = useState(''); const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  useEffect(() => {
    let live = true;
    backend.consentStatus().then(v => { if (live) setState(v); }, e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [backend]);
  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await fn(); setState(await backend.consentStatus()); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  if (state?.allowed) return <>{children}</>;
  return <Card><View style={styles.stack}>
    <Text style={[type.heading, styles.heading]}>{t('Yaş ve veli onayı')}</Text>
    <Text style={type.body}>{t('Tam doğum tarihinizi istemiyoruz. 18 yaş altı adaylar için veli e-posta onayı ve kurumun veli yetkisini doğrulaması gerekir. Bu adımlar tamamlanana kadar sınav, mikrofon ve kamera hazırlığı açılmaz.')}</Text>
    {!state && !error ? <Message text={t('Onay durumu kontrol ediliyor…')} /> : null}
    {state && !state.ageBand ? <View style={styles.stack}>
      {(['UNDER_13', '13_17', 'ADULT'] as const).map((value, i) => <Button key={value} label={t(['13 yaş altı', '13–17 yaş', '18 yaş ve üzeri'][i])} disabled={busy} variant="secondary" onPress={() => act(() => backend.declareAge(value))} />)}
    </View> : null}
    {state?.status === 'RENEWAL_REQUIRED' && state.ageBand ? <Button label={t('Güncel koşullarla devam et')} disabled={busy} onPress={() => act(() => backend.declareAge(state.ageBand!))} /> : null}
    {state?.status === 'PROVIDER_CONFIGURATION_REQUIRED' ? <Message text={t('Çocuk sürümünün veri işleme hazırlıkları sürüyor. Henüz sınav açılamaz veya veli onayı istenemez.')} /> : null}
    {state?.guardianRequired && state.status !== 'PROVIDER_CONFIGURATION_REQUIRED' ? <View style={styles.stack}>
      <Field icon="mail" label={t('Velinin e-posta adresi')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!busy} />
      <Button label={t('Veliye onay bağlantısı gönder')} disabled={busy || !email.trim()} onPress={() => act(async () => { await backend.requestGuardian(email.trim()); setSent(true); })} />
    </View> : null}
    {sent ? <Message text={t('Bağlantı gönderildi. Velinizin onayı ve kurumunuzun veli yetkisini doğrulaması bekleniyor.')} /> : null}
    {state?.status === 'SCHOOL_VERIFICATION_REQUIRED' ? <Message text={t('Veli e-posta onayı alındı. Kurumunuzun veli yetkisini doğrulaması bekleniyor.')} /> : null}
    {state?.status === 'REVOKED' ? <Message text={t('Veli onayı geri çekildi. Sınav açılamaz.')} /> : null}
    {error ? <Message tone="error" text={error} /> : null}
    <Button label={t('Durumu yenile')} variant="secondary" disabled={busy} onPress={() => act(async () => {})} />
    <LegalLinks />
  </View></Card>;
}
const styles = StyleSheet.create({ stack: { gap: 16 }, heading: { color: color.ink } });
