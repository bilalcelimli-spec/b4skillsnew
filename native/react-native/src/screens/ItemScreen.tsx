import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AssessmentItem, canRender, choiceText, responseMode } from '../api';
import { Icon } from '../components/Icon';
import { Button, Card, Eyebrow, Message, ProgressBar } from '../components/ui';
import { B4Native, nativeEvents } from '../native';
import { color, skillMeta, type } from '../theme';
import { AssessmentState } from '../useAssessment';
import { formatSeconds, MAX_RECORDING_SECONDS, RecorderState } from '../useRecorder';

const MAX_PLAYS = 2;

export function ItemScreen({ store, recorder, item, wide }: {
  store: AssessmentState; recorder: RecorderState; item: AssessmentItem; wide: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [writing, setWriting] = useState('');
  const mode = responseMode(item);
  const meta = skillMeta(item.skill);
  const content = item.metadata ?? {};
  const passage = item.skill !== 'LISTENING' ? content.passage || content.stimulus : null;
  const imageUrl = store.mediaUrl(content.imageUrl);
  const audioUrl = store.mediaUrl(content.audioUrl);
  const words = writing.trim() ? writing.trim().split(/\s+/).length : 0;
  const progress = store.progress;
  const total = progress?.maxItems ?? 0;
  const done = progress?.progress ?? store.answered;

  const hasAnswer =
    mode === 'choice' ? selected !== null
    : mode === 'text' ? writing.trim().length > 0
    : mode === 'audio' ? !!recorder.clip && !recorder.recording
    : false;

  const submit = () => {
    B4Native.stopPlayback();
    if (mode === 'choice' && selected !== null) store.submit({ kind: 'choice', index: selected });
    else if (mode === 'text') store.submit({ kind: 'text', text: writing });
    else if (mode === 'audio' && recorder.clip) store.submit({ kind: 'audio', base64: recorder.clip.base64 });
  };

  const question = (
    <Card style={wide && passage ? { flex: 1 } : undefined}>
      <View style={{ gap: 24 }}>
        {!canRender(item) ? (
          <View style={{ gap: 14 }}>
            <View style={styles.row}><Icon name="hand" size={20} color={color.warning} />
              <Text style={[type.heading, { color: color.ink, fontSize: 19 }]}>Bu soru biçimi uygulamada henüz desteklenmiyor.</Text></View>
            <Text style={[type.small, { color: color.muted }]}>
              Yanıt gönderilmedi. Aynı oturuma web uygulamasından devam edebilirsiniz. Oturum kimliği: {store.sessionId}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.prompt} selectable>{content.prompt}</Text>
            {passage && !wide ? <Passage text={passage} /> : null}
            {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
            {audioUrl ? <ListeningPlayer key={item.id} url={audioUrl} disabled={recorder.recording} /> : null}

            {mode === 'choice' ? (
              <View style={{ gap: 10 }} accessibilityRole="radiogroup">
                {(content.options ?? []).map((option, index) => (
                  <ChoiceRow key={index} index={index} text={choiceText(option)} selected={selected === index} onPress={() => setSelected(index)} />
                ))}
              </View>
            ) : null}

            {mode === 'text' ? (
              <View style={{ gap: 10 }}>
                <Eyebrow tone={color.muted}>Yanıtınız</Eyebrow>
                <TextInput
                  accessibilityLabel="Yazılı yanıt"
                  multiline value={writing} onChangeText={setWriting} placeholder="Yanıtınızı buraya yazın…"
                  placeholderTextColor={color.faint} style={styles.editor} textAlignVertical="top"
                  autoCorrect={false} spellCheck={false} autoCapitalize="sentences"
                />
                <View style={styles.rowBetween}>
                  <Text style={[type.caption, { color: content.minWords && words < content.minWords ? color.warning : color.muted, fontWeight: '600' }]}>
                    {words} kelime
                  </Text>
                  <Text style={[type.caption, { color: color.muted }]}>
                    {[content.minWords ? `En az ${content.minWords}` : null, content.maxWords ? `en fazla ${content.maxWords}` : null].filter(Boolean).join(' · ')}
                    {content.minWords || content.maxWords ? ' kelime' : ''}
                  </Text>
                </View>
              </View>
            ) : null}

            {mode === 'audio' ? <SpeakingRecorder recorder={recorder} /> : null}

            <View style={styles.divider} />
            <View style={[styles.rowBetween, { flexWrap: 'wrap' }]}>
              <View style={[styles.row, { flexShrink: 1 }]}>
                <Icon name="shield" size={14} color={color.muted} />
                <Text style={[type.caption, { color: color.muted }]}>Yanıtınız gönderildiğinde kaydedilir ve değiştirilemez.</Text>
              </View>
              <Button label="Yanıtı gönder" trailingIcon="arrowRight" onPress={submit}
                disabled={!hasAnswer || recorder.recording} loading={store.busy} style={{ minWidth: 200 }} />
            </View>
          </>
        )}
      </View>
    </Card>
  );

  return (
    <View style={{ gap: 22 }}>
      <View style={styles.header}>
        <View style={styles.skillBadge}><Icon name={meta.icon} size={26} color={color.plum} /></View>
        <View style={{ flex: 1, gap: 6 }}>
          <Eyebrow>Değerlendirmeniz devam ediyor</Eyebrow>
          <Text style={[type.title, { color: color.ink }]}>{meta.label}</Text>
        </View>
        {total > 0 ? (
          <View style={styles.progressBox} accessible accessibilityLabel={`${done} yanıt, en fazla ${total}`}>
            <Text style={[type.caption, { color: color.muted }]}>
              <Text style={{ color: color.ink, fontWeight: '700', fontSize: 15 }}>{done}</Text> / en fazla {total}
            </Text>
            <ProgressBar value={done / total} />
          </View>
        ) : null}
      </View>

      {wide && passage && canRender(item) ? (
        <View style={styles.split}>
          <View style={{ flex: 1 }}><Passage text={passage} tall /></View>
          {question}
        </View>
      ) : question}
    </View>
  );
}

function Passage({ text, tall }: { text: string; tall?: boolean }) {
  return (
    <View style={[styles.passage, tall && styles.passageTall]}>
      <View style={[styles.row, { marginBottom: 14 }]}>
        <Icon name="book" size={15} color={color.plum} />
        <Eyebrow>Okuma metni</Eyebrow>
      </View>
      <Text style={styles.passageText} selectable>{text}</Text>
    </View>
  );
}

function ChoiceRow({ index, text, selected, onPress }: { index: number; text: string; selected: boolean; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  const letter = String.fromCharCode(65 + index);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${letter}. ${text}`}
      style={({ pressed }) => [
        styles.choice,
        (hovered || pressed) && !selected && { borderColor: '#D9C6D3', backgroundColor: '#FCF8FB' },
        selected && styles.choiceSelected,
        { cursor: 'pointer' } as any,
      ]}
    >
      <View style={[styles.letter, selected && { backgroundColor: color.plum }]}>
        <Text style={[styles.letterText, selected && { color: color.onDark }]}>{letter}</Text>
      </View>
      <Text style={[type.body, { color: color.ink, flex: 1 }]}>{text}</Text>
      {selected ? <Icon name="checkCircle" size={20} color={color.plum} /> : null}
    </Pressable>
  );
}

function ListeningPlayer({ url, disabled }: { url: string; disabled: boolean }) {
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ended = nativeEvents.addListener('B4PlaybackEnded', () => setPlaying(false));
    const failed = nativeEvents.addListener('B4PlaybackFailed', (e: { message: string }) => { setPlaying(false); setError(e.message); });
    return () => { ended.remove(); failed.remove(); B4Native.stopPlayback(); };
  }, []);

  const play = async () => {
    setError(null);
    try {
      await B4Native.play(url);
      setPlays(n => n + 1);
      setPlaying(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const left = MAX_PLAYS - plays;

  return (
    <View style={styles.player}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Dinlemeyi durdur' : 'Kaydı dinle'}
        disabled={disabled || (!playing && left <= 0)}
        onPress={() => (playing ? (B4Native.stopPlayback(), setPlaying(false)) : play())}
        style={[styles.playButton, (disabled || (!playing && left <= 0)) && { opacity: 0.4 }, { cursor: 'pointer' } as any]}
      >
        <Icon name={playing ? 'pause' : 'play'} size={22} color={color.onDark} />
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[type.body, { color: color.onDark, fontWeight: '600' }]}>
          {playing ? 'Dinleniyor…' : left > 0 ? 'Kaydı dinleyin' : 'Dinleme hakkınız doldu'}
        </Text>
        <Text style={[type.caption, { color: color.onDarkMuted }]}>
          {left > 0 ? `${left} dinleme hakkınız kaldı` : 'Soruyu yanıtlayabilirsiniz'} · Durdurulan dinleme hakkınızdan düşer
        </Text>
        {error ? <Text style={[type.caption, { color: '#FCA5A5' }]}>{error}</Text> : null}
      </View>
      <View style={styles.dots}>
        {Array.from({ length: MAX_PLAYS }, (_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i < plays ? color.gold : 'rgba(255,255,255,0.2)' }]} />
        ))}
      </View>
    </View>
  );
}

function SpeakingRecorder({ recorder }: { recorder: RecorderState }) {
  const ring = 1 + recorder.level * 0.5;
  const ready = !!recorder.clip && !recorder.recording;
  return (
    <View style={styles.speaking}>
      <View style={styles.micWrap}>
        <View style={[styles.micRing, { transform: [{ scale: recorder.recording ? ring : 1 }], opacity: recorder.recording ? 0.6 : 0 }]} />
        <View style={[styles.mic, recorder.recording && { backgroundColor: color.plum }]}>
          <Icon name={recorder.recording ? 'waveform' : ready ? 'check' : 'mic'} size={36}
            color={recorder.recording ? color.onDark : color.plum} />
        </View>
      </View>
      <Text style={[type.heading, { color: color.ink }]}>
        {recorder.recording ? 'Sizi dinliyoruz.' : ready ? 'Kaydınız hazır.' : 'Söz sizde.'}
      </Text>
      <Text style={[type.small, { color: color.muted, textAlign: 'center' }]}>
        {recorder.recording
          ? `${formatSeconds(recorder.seconds)} / ${formatSeconds(MAX_RECORDING_SECONDS)} · Bitirdiğinizde kaydı durdurun.`
          : ready
            ? `${formatSeconds((recorder.clip?.durationMs ?? 0) / 1000)} kaydedildi. Göndermeden önce yeniden kaydedebilirsiniz.`
            : `Hazır olduğunuzda kayda başlayın. En fazla ${MAX_RECORDING_SECONDS / 60} dakika.`}
      </Text>
      <Button
        label={recorder.recording ? 'Kaydı bitir' : ready ? 'Yeniden kaydet' : 'Kayda başla'}
        icon={recorder.recording ? 'stop' : 'mic'}
        variant={recorder.recording ? 'primary' : 'secondary'}
        loading={recorder.preparing}
        onPress={() => { B4Native.stopPlayback(); recorder.recording ? recorder.stop() : recorder.start(); }}
        style={{ alignSelf: 'center' }}
      />
      {recorder.error ? <Message tone="error" text={recorder.error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  skillBadge: { width: 62, height: 62, borderRadius: 18, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
  progressBox: { width: 200, gap: 8 },
  split: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  prompt: { fontSize: 21, lineHeight: 30, fontWeight: '600', color: color.ink, letterSpacing: -0.2 },
  passage: { backgroundColor: color.canvas, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: color.line },
  passageTall: { backgroundColor: color.surface, borderRadius: 24, padding: 30 },
  passageText: { fontSize: 17, lineHeight: 29, color: color.body, fontFamily: 'Georgia' },
  image: { width: '100%', height: 260, borderRadius: 14, backgroundColor: color.canvas },
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 58, borderRadius: 14,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
  },
  choiceSelected: { borderColor: color.plum, backgroundColor: color.wash },
  letter: { width: 32, height: 32, borderRadius: 9, backgroundColor: color.canvas, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontSize: 13, fontWeight: '700', color: color.muted },
  editor: {
    minHeight: 260, padding: 18, fontSize: 17, lineHeight: 26, color: color.ink, borderRadius: 14,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.canvas,
  },
  divider: { height: 1, backgroundColor: color.line },
  player: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 18, backgroundColor: color.navy },
  playButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.plum, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  speaking: { alignItems: 'center', gap: 14, paddingVertical: 18 },
  micWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: 104, height: 104, borderRadius: 52, backgroundColor: color.wash, borderWidth: 2, borderColor: color.plumSoft },
  mic: { width: 92, height: 92, borderRadius: 46, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
});
