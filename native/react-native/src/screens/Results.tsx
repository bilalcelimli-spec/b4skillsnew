import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, Card, Eyebrow, ProgressBar } from '../components/ui';
import { color, skillMeta, type } from '../theme';
import { AssessmentState } from '../useAssessment';

const ORDER = ['READING', 'LISTENING', 'WRITING', 'SPEAKING', 'GRAMMAR', 'VOCABULARY'];

export function Results({ store, wide }: { store: AssessmentState; wide: boolean }) {
  const result = store.progress;
  const skills = Object.entries(result?.skills ?? {}).sort(
    ([a], [b]) => (ORDER.indexOf(a.toUpperCase()) + 99) % 99 - (ORDER.indexOf(b.toUpperCase()) + 99) % 99,
  );
  const pending = result?.pendingCount ?? 0;

  return (
    <View style={{ gap: 26 }}>
      <View style={{ gap: 10 }}>
        <Eyebrow>Değerlendirme özeti</Eyebrow>
        <Text style={[type.title, { color: color.ink, fontSize: 38, lineHeight: 44 }]}>İngilizcenize daha yakından bakın.</Text>
      </View>

      {result ? (
        <View style={[{ gap: 20 }, wide && { flexDirection: 'row', alignItems: 'flex-start' }]}>
          <View style={[styles.hero, wide && { width: 360 }]}>
            <Eyebrow tone={color.gold}>{result.provisional === false ? 'CEFR düzeyi' : 'Geçici CEFR düzeyi'}</Eyebrow>
            <Text style={styles.level} accessibilityLabel={`CEFR düzeyi ${result.cefrLevel ?? 'bekleniyor'}`}>
              {result.cefrLevel ?? '—'}
            </Text>
            <Text style={[type.heading, { color: color.onDark, fontSize: 21 }]}>
              {result.cefrLevel ? 'Oturumunuz tamamlandı.' : 'Puanlama bekleniyor.'}
            </Text>
            <View style={styles.heroStats}>
              <Stat value={String(result.progress)} label="yanıt kaydedildi" />
              <View style={styles.heroDivider} />
              <Stat value={String(pending)} label="inceleme bekliyor" />
            </View>
          </View>

          <Card style={wide ? { flex: 1 } : undefined}>
            <View style={{ gap: 20 }}>
              <View style={styles.rowBetween}>
                <Text style={[type.heading, { color: color.ink, fontSize: 20 }]}>Beceri görünümünüz</Text>
                <Text style={[type.caption, { color: color.muted }]}>100 üzerinden</Text>
              </View>
              {skills.length === 0 ? (
                <Text style={[type.small, { color: color.muted }]}>Beceri puanları henüz hazır değil.</Text>
              ) : skills.map(([skill, value]) => <SkillRow key={skill} skill={skill} value={value} />)}
              <View style={styles.divider} />
              <Text style={[type.caption, { color: color.muted, lineHeight: 17 }]}>
                Bu görünüm sunucunun bildirdiği geçici sonuçları içerir. İnceleme bekleyen yanıtlar tamamlandıkça güncellenir; doğrulanmış sertifika değildir.
              </Text>
              <View style={[styles.row, { flexWrap: 'wrap', gap: 10 }]}>
                <Button label="Sonuçları yenile" icon="refresh" variant="secondary" onPress={store.refreshProgress} loading={store.busy} />
                <Button label="Ana sayfa" variant="ghost" onPress={store.leaveResults} />
              </View>
            </View>
          </Card>
        </View>
      ) : (
        <Card>
          <View style={{ gap: 16 }}>
            <Text style={[type.heading, { color: color.ink }]}>Sonuçlarınız hazırlanıyor.</Text>
            <Button label="Sonuçları getir" icon="refresh" variant="secondary" onPress={store.refreshProgress} loading={store.busy} />
          </View>
        </Card>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: color.onDark, fontSize: 24, fontWeight: '700' }}>{value}</Text>
      <Text style={[type.caption, { color: color.onDarkMuted }]}>{label}</Text>
    </View>
  );
}

function SkillRow({ skill, value }: { skill: string; value: number | null }) {
  const meta = skillMeta(skill);
  const known = typeof value === 'number' && Number.isFinite(value);
  return (
    <View style={styles.skillRow} accessible accessibilityLabel={`${meta.label}: ${known ? Math.round(value as number) : 'bekleniyor'}`}>
      <View style={styles.skillIcon}><Icon name={meta.icon} size={18} color={color.plum} /></View>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={[type.small, { color: color.ink, fontWeight: '600' }]}>{meta.label}</Text>
        {known ? <ProgressBar value={(value as number) / 100} /> : (
          <Text style={[type.caption, { color: color.muted }]}>İnceleme tamamlandığında görünecek</Text>
        )}
      </View>
      <Text style={[known ? { fontSize: 20, fontWeight: '700', color: color.ink } : [type.caption, { color: color.muted }], { minWidth: 72, textAlign: 'right' }]}>
        {known ? Math.round(value as number) : 'Bekleniyor'}
      </Text>
    </View>
  );
}

export function NextStep({ store }: { store: AssessmentState }) {
  return (
    <Card>
      <View style={{ gap: 18 }}>
        <Eyebrow>Devam etmeye hazırsınız</Eyebrow>
        <Text style={[type.heading, { color: color.ink, fontSize: 28, lineHeight: 34 }]}>Bir sonraki adım.</Text>
        <Text style={[type.body, { color: color.muted }]}>
          {store.busy ? 'Sıradaki soru hazırlanıyor…' : 'Önceki yanıtınız kaydedildi. Değerlendirmenize devam edin.'}
        </Text>
        <Button label="Sonraki soruyu yükle" trailingIcon="arrowRight" onPress={store.retryNext} loading={store.busy} />
      </View>
    </Card>
  );
}

export function Recovery({ store }: { store: AssessmentState }) {
  return (
    <Card>
      <View style={{ gap: 18 }}>
        <View style={styles.recoveryIcon}><Icon name="refresh" size={26} color={color.plum} /></View>
        <Text style={[type.heading, { color: color.ink, fontSize: 26 }]}>Yanıtınızı kontrol ediyoruz.</Text>
        <Text style={[type.body, { color: color.muted }]}>
          Bağlantı kesilmiş olabilir. Aynı yanıtı ikinci kez göndermemek için önce kaydınızın sunucuya ulaşıp ulaşmadığını kontrol edin.
        </Text>
        <Button label="Kaydımı kontrol et" icon="shield" onPress={store.reconcile} loading={store.busy} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { backgroundColor: color.navy, borderRadius: 24, padding: 30, gap: 12, overflow: 'hidden' },
  level: { fontSize: 88, lineHeight: 96, fontWeight: '700', color: color.gold, letterSpacing: -3 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14, paddingTop: 18, borderTopWidth: 1, borderTopColor: color.onDarkFaint },
  heroDivider: { width: 1, alignSelf: 'stretch', backgroundColor: color.onDarkFaint },
  divider: { height: 1, backgroundColor: color.line },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  skillIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
  recoveryIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
});
