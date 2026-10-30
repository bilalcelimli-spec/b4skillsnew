import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Text } from './Text';
import { languages, languageNames, t } from './core';
import { useLanguage } from './store';
import { color } from '../theme';

export function LanguagePicker({ dark = false }: { dark?: boolean }) {
  const { language, pending, failed, selectLanguage } = useLanguage();
  const compact = useWindowDimensions().width < 900;
  return <View style={{ gap: 3, maxWidth: '100%' }}>
    <View accessibilityRole="radiogroup" accessibilityLabel={t('Uygulama dili')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
      {languages.map(value => <Pressable key={value} accessibilityRole="radio"
        accessibilityLabel={languageNames[value]} accessibilityState={{ checked: language === value, disabled: pending }}
        disabled={pending} onPress={() => { void selectLanguage(value); }}
        style={{ paddingHorizontal: 9, minHeight: 44, justifyContent: 'center', borderRadius: 10,
          backgroundColor: language === value ? (dark ? 'rgba(255,255,255,0.16)' : color.wash) : 'transparent' }}>
        <Text direction={value === 'ar' ? 'rtl' : 'ltr'} style={{ fontSize: 12, fontWeight: language === value ? '700' : '500', color: dark ? color.onDark : color.plum }}>
          {compact && value !== 'ar' ? value.toUpperCase() : languageNames[value]}
        </Text>
      </Pressable>)}
    </View>
    {failed ? <Text accessibilityRole="alert" style={{ color: dark ? color.onDark : color.danger, fontSize: 12 }}>{t('Dil tercihi kaydedilemedi. Yeniden deneyin.')}</Text> : null}
  </View>;
}
