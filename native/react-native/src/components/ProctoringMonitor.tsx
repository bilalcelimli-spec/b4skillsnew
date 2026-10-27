// Always-visible exam monitoring panel (web: ProctoringMonitor). Lives in the navy sidebar on wide
// layouts and as a slim strip under the compact bar otherwise, so it never covers the question.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../i18n/Text';
import { t, translateMessage } from '../i18n/core';
import type { ExamMonitorState } from '../proctoring/useExamMonitor';
import { color, type } from '../theme';
import { CameraPreview } from './CameraPreview';
import { Icon } from './Icon';
import { Button } from './ui';

function statusCopy(m: ExamMonitorState): { label: string; tone: string } {
  switch (m.status) {
    case 'active':
      return m.faceCount === 0 ? { label: t('Yüzünüz görünmüyor'), tone: color.gold }
        : m.faceCount !== null && m.faceCount > 1 ? { label: t('Birden fazla yüz görünüyor'), tone: color.gold }
        : { label: t('Gözetim açık'), tone: '#4ADE80' };
    case 'starting': case 'checking': return { label: t('Kamera başlatılıyor…'), tone: color.onDarkMuted };
    case 'paused': return { label: t('Uygulama arka planda · olay kaydedildi'), tone: color.gold };
    case 'off': return { label: t('Kamera bu kurumda kapalı · olaylar kaydediliyor'), tone: color.onDarkMuted };
    default: return { label: t('Kamera kullanılamıyor · olaylar kaydediliyor'), tone: '#FCA5A5' };
  }
}

const warningCopy = (m: ExamMonitorState) =>
  m.warning === 'FACE_NOT_DETECTED' ? t('Yüzünüz birkaç saniyedir görünmüyor. Kameraya bakın; bu bir teknik kayıttır, ihlal kararı değildir.')
  : m.warning === 'MULTIPLE_FACES' ? t('Kamerada birden fazla kişi görünüyor. Bu durum kaydedildi.')
  : null;

export function ProctoringMonitor({ monitor, variant }: { monitor: ExamMonitorState; variant: 'sidebar' | 'compact' }) {
  const status = statusCopy(monitor);
  const warning = warningCopy(monitor);
  const showPreview = monitor.status === 'active';

  if (variant === 'compact') {
    return (
      <View style={styles.strip} accessibilityRole="summary" accessibilityLabel={status.label}>
        {showPreview ? <CameraPreview style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbOff]}><Icon name="user" size={18} color={color.onDarkMuted} /></View>}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.row}><View style={[styles.dot, { backgroundColor: status.tone }]} /><Text style={styles.stripLabel}>{status.label}</Text></View>
          {warning ? <Text accessibilityLiveRegion="assertive" style={styles.stripWarning}>{warning}</Text> : null}
        </View>
        {monitor.status === 'unavailable' ? <Button label={t('Yeniden dene')} variant="onDark" compact onPress={() => void monitor.retry()} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.card} accessibilityLabel={t('Sınav gözetimi')}>
      <View style={styles.row}>
        <Text style={[type.eyebrow, { color: color.gold }]}>{t('GÖZETİM')}</Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.dot, { backgroundColor: status.tone }]} />
      </View>
      {showPreview ? (
        <CameraPreview style={styles.preview} />
      ) : (
        <View style={[styles.preview, styles.previewOff]}>
          <Icon name="user" size={28} color={color.onDarkMuted} />
        </View>
      )}
      <Text accessibilityLiveRegion="polite" style={[styles.label, { color: status.tone }]}>{status.label}</Text>
      {warning ? <Text accessibilityLiveRegion="assertive" style={styles.warning}>{warning}</Text> : null}
      {monitor.status === 'unavailable' ? (
        <>
          {monitor.detail ? <Text style={styles.detail}>{translateMessage(monitor.detail)}</Text> : null}
          <Button label={t('Yeniden dene')} variant="onDark" compact onPress={() => void monitor.retry()} />
        </>
      ) : null}
      <Text style={styles.detail}>
        {t('Yüz sayımı cihazda yapılır; video gönderilmez.')}{monitor.baselineSent ? t(' Başlangıç fotoğrafı alındı.') : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 22, padding: 14, gap: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' },
  previewOff: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  label: { fontSize: 13, fontWeight: '600' },
  warning: { fontSize: 12, lineHeight: 17, color: color.gold },
  detail: { fontSize: 11, lineHeight: 15, color: color.onDarkMuted },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: color.navyRaised },
  thumb: { width: 64, height: 48, borderRadius: 8, overflow: 'hidden', backgroundColor: '#000' },
  thumbOff: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  stripLabel: { fontSize: 13, fontWeight: '600', color: color.onDark },
  stripWarning: { fontSize: 12, color: color.gold },
});
