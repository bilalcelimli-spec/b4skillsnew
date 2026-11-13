import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../i18n/Text';
import { t } from '../i18n/core';
import { color, type } from '../theme';

const pages = [
  ['Gizlilik politikası', 'https://b4skills.com/privacy'],
  ['Kullanım koşulları', 'https://b4skills.com/terms'],
  ['Yardım ve destek', 'https://b4skills.com/support'],
] as const;

/** Fixed public URLs: never include account identifiers or session credentials. */
export function LegalLinks({ dark = false }: { dark?: boolean }) {
  const [failed, setFailed] = useState(false);
  const open = async (url: string) => {
    setFailed(false);
    try { await Linking.openURL(url); } catch { setFailed(true); }
  };
  return <View style={styles.root}>
    <View style={styles.links}>
      {pages.map(([label, url]) => <Pressable key={url} accessibilityRole="link"
        accessibilityLabel={t(label)} onPress={() => open(url)} style={styles.link}>
        <Text style={[type.caption, styles.label, { color: dark ? color.onDarkMuted : color.plum }]}>{t(label)}</Text>
      </Pressable>)}
    </View>
    {failed ? <Text accessibilityRole="alert" style={[type.caption, { color: dark ? color.onDarkMuted : color.muted }]}>{t('Bağlantı açılamadı. Tarayıcınızdan b4skills.com/support adresini ziyaret edin.')}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  link: { paddingVertical: 10 },
  label: { textDecorationLine: 'underline' },
});
