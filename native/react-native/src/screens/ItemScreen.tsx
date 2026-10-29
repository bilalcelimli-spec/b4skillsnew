import { Text } from "../i18n/Text";
import { t } from "../i18n/core";
import React, { useState } from 'react';
import { pointerCursor, useHover } from '../components/hover';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AssessmentItem, blankTask, completeBlanks, canRender, choiceText, responseMode } from '../api';
import { Icon } from '../components/Icon';
import { Button, Card, Eyebrow, Field, Message, ProgressBar } from '../components/ui';
import { B4Native } from '../native';
import { MAX_PLAYS, useListeningPlayer } from '../useListeningPlayer';
import { color, skillMeta, type } from '../theme';
import { AssessmentState } from '../useAssessment';
import { formatSeconds, MAX_RECORDING_SECONDS, RecorderState } from '../useRecorder';
export function ItemScreen({
  store,
  recorder,
  item,
  wide
}: {
  store: AssessmentState;
  recorder: RecorderState;
  item: AssessmentItem;
  wide: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [writing, setWriting] = useState('');
  const task = blankTask(item);
  const [blanks, setBlanks] = useState<string[]>(() => Array(task.count).fill(''));
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
  const hasAnswer = mode === 'choice' ? selected !== null : mode === 'blanks' ? completeBlanks(blanks, task.count) : mode === 'text' ? writing.trim().length > 0 : mode === 'audio' ? !!recorder.clip && !recorder.recording : false;
  const submit = () => {
    B4Native.stopPlayback();
    if (mode === 'choice' && selected !== null) store.submit({
      kind: 'choice',
      index: selected
    });else if (mode === 'blanks' && completeBlanks(blanks, task.count)) store.submit({
      kind: 'blanks',
      answers: blanks
    });else if (mode === 'text') store.submit({
      kind: 'text',
      text: writing
    });else if (mode === 'audio' && recorder.clip) store.submit({
      kind: 'audio',
      base64: recorder.clip.base64
    });
  };
  const question = <Card style={wide && passage ? {
    flex: 1
  } : undefined}>
      <View style={{
      gap: 24
    }}>
        {!canRender(item) ? <View style={{
        gap: 14
      }}>
            <View style={styles.row}><Icon name="hand" size={20} color={color.warning} />
              <Text style={[type.heading, {
            color: color.ink,
            fontSize: 19
          }]}>{t("Bu soru biçimi uygulamada henüz desteklenmiyor.")}</Text></View>
            <Text style={[type.small, {
          color: color.muted
        }]}>{t("Yanıt gönderilmedi. Aynı oturuma web uygulamasından devam edebilirsiniz. Oturum kimliği: ")}{store.sessionId}
            </Text>
          </View> : <>
            <Text direction={mode === "blanks" && content.prompt?.includes("___") ? undefined : "ltr"} style={styles.prompt} selectable>{mode === 'blanks' && content.prompt?.includes('___') ? t("Boşlukları tamamlayın.") : content.prompt}</Text>
            {passage && !wide ? <Passage text={passage} /> : null}
            {imageUrl ? <Image source={{
          uri: imageUrl
        }} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
            {audioUrl ? <ListeningPlayer key={item.id} url={audioUrl} disabled={recorder.recording} /> : null}

            {mode === 'choice' ? <View style={{
          gap: 10
        }} accessibilityRole="radiogroup">
                {(content.options ?? []).map((option, index) => <ChoiceRow key={index} index={index} text={choiceText(option)} selected={selected === index} onPress={() => setSelected(index)} />)}
              </View> : null}

            {mode === 'text' ? <View style={{
          gap: 10
        }}>
                <Eyebrow tone={color.muted}>{t("Yanıtınız")}</Eyebrow>
                <TextInput accessibilityLabel={t("Yazılı yanıt")} multiline value={writing} onChangeText={setWriting} placeholder={t("Yanıtınızı buraya yazın…")} placeholderTextColor={color.faint} style={[styles.editor, { direction: "ltr", writingDirection: "ltr", textAlign: "left" }]} textAlignVertical="top" autoCorrect={false} spellCheck={false} autoCapitalize="sentences" />
                <View style={styles.rowBetween}>
                  <Text style={[type.caption, {
              color: content.minWords && words < content.minWords ? color.warning : color.muted,
              fontWeight: '600'
            }]}>
                    {words}{t(" kelime")}</Text>
                  <Text style={[type.caption, {
              color: color.muted
            }]}>
                    {[content.minWords ? t("En az {0}", [content.minWords]) : null, content.maxWords ? t("en fazla {0}", [content.maxWords]) : null].filter(Boolean).join(' · ')}
                    {content.minWords || content.maxWords ? t(" kelime") : ''}
                  </Text>
                </View>
              </View> : null}

            {mode === 'blanks' ? <View style={{
          gap: 18
        }}>
                {task.scaffold ? <Text direction="ltr" style={[type.body, {
            color: color.ink
          }]} selectable>{(() => {
              let number = 0;
              return task.scaffold.replace(/___/g, () => `___ (${++number})`);
            })()}</Text> : null}
                <Text style={[type.caption, {
            color: color.muted
          }]}>{blanks.filter(a => a.trim()).length} / {task.count}{t(" boşluk tamamlandı")}</Text>
                {blanks.map((value, index) => <View key={index} style={{
            gap: 10
          }}>
                    {task.choices.length ? <Eyebrow tone={color.muted}>{t("{0}. boşluk", [index + 1])}</Eyebrow> : null}
                    {task.choices.length ? <View accessibilityRole="radiogroup" accessibilityLabel={t("{0}. boşluk seçenekleri", [index + 1])} style={{
              gap: 8
            }}>
                        {task.choices.map((text, option) => <ChoiceRow key={option} index={option} text={text} selected={value === text} onPress={() => setBlanks(current => current.map((a, i) => i === index ? text : a))} />)}
                      </View> : <Field label={t("{0}. boşluk", [index + 1])} icon="hash" value={value} onChangeText={text => setBlanks(current => current.map((a, i) => i === index ? text : a))} autoCorrect={false} spellCheck={false} autoCapitalize="none" maxLength={500} placeholder={t("Yanıtınızı yazın")} />}
                  </View>)}
                {blanks.some(a => a.includes('|')) ? <Message tone="error" text={t("Yanıtlarda | işaretini kullanmayın.")} /> : null}
              </View> : null}

            {mode === 'audio' ? <SpeakingRecorder recorder={recorder} /> : null}

            <View style={styles.divider} />
            <View style={[styles.rowBetween, {
          flexWrap: 'wrap'
        }]}>
              <View style={[styles.row, {
            flexShrink: 1
          }]}>
                <Icon name="shield" size={14} color={color.muted} />
                <Text style={[type.caption, {
              color: color.muted
            }]}>{t("Yanıtınız gönderildiğinde kaydedilir ve değiştirilemez.")}</Text>
              </View>
              <Button label={t("Yanıtı gönder")} trailingIcon="arrowRight" onPress={submit} disabled={!hasAnswer || recorder.recording} loading={store.busy} style={{
            minWidth: 200
          }} />
            </View>
          </>}
      </View>
    </Card>;
  return <View style={{
    gap: 22
  }}>
      <View style={styles.header}>
        <View style={styles.skillBadge}><Icon name={meta.icon} size={26} color={color.plum} /></View>
        <View style={{
        flex: 1,
        gap: 6
      }}>
          <Eyebrow>{t("Değerlendirmeniz devam ediyor")}</Eyebrow>
          <Text style={[type.title, {
          color: color.ink
        }]}>{meta.label}</Text>
        </View>
        {total > 0 ? <View style={styles.progressBox} accessible accessibilityLabel={t("{0} yanıt, en fazla {1}", [done, total])}>
            <Text style={[type.caption, {
          color: color.muted
        }]}>
              <Text style={{
            color: color.ink,
            fontWeight: '700',
            fontSize: 15
          }}>{done}</Text>{t(" / en fazla ")}{total}
            </Text>
            <ProgressBar value={done / total} />
          </View> : null}
      </View>

      {wide && passage && canRender(item) ? <View style={styles.split}>
          <View style={{
        flex: 1
      }}><Passage text={passage} tall /></View>
          {question}
        </View> : question}
    </View>;
}
function Passage({
  text,
  tall
}: {
  text: string;
  tall?: boolean;
}) {
  return <View style={[styles.passage, tall && styles.passageTall]}>
      <View style={[styles.row, {
      marginBottom: 14
    }]}>
        <Icon name="book" size={15} color={color.plum} />
        <Eyebrow>{t("Okuma metni")}</Eyebrow>
      </View>
      <Text direction="ltr" style={styles.passageText} selectable>{text}</Text>
    </View>;
}
function ChoiceRow({
  index,
  text,
  selected,
  onPress
}: {
  index: number;
  text: string;
  selected: boolean;
  onPress: () => void;
}) {
  const [hovered, hoverProps] = useHover();
  const letter = String.fromCharCode(65 + index);
  return <Pressable onPress={onPress} {...hoverProps} accessibilityRole="radio" accessibilityState={{
    selected,
    checked: selected
  }} accessibilityLabel={`${letter}. ${text}`} style={({
    pressed
  }) => [styles.choice, { direction: "ltr" }, (hovered || pressed) && !selected && {
    borderColor: '#D9C6D3',
    backgroundColor: '#FCF8FB'
  }, selected && styles.choiceSelected, pointerCursor]}>
      <View style={[styles.letter, selected && {
      backgroundColor: color.plum
    }]}>
        <Text style={[styles.letterText, selected && {
        color: color.onDark
      }]}>{letter}</Text>
      </View>
      <Text direction="ltr" style={[type.body, {
      color: color.ink,
      flex: 1
    }]}>{text}</Text>
      {selected ? <Icon name="checkCircle" size={20} color={color.plum} /> : null}
    </Pressable>;
}
function ListeningPlayer({
  url,
  disabled
}: {
  url: string;
  disabled: boolean;
}) {
  const {
    plays,
    state,
    error,
    play,
    stop,
    left
  } = useListeningPlayer(url);
  const playing = state === 'playing';
  const loading = state === 'loading';
  return <View style={styles.player}>
      <Pressable accessibilityRole="button" accessibilityLabel={playing || loading ? t("Dinlemeyi durdur") : t("Kaydı dinle")} disabled={disabled || !playing && left <= 0} onPress={() => playing || loading ? stop() : play()} style={[styles.playButton, (disabled || !playing && left <= 0) && {
      opacity: 0.4
    }, pointerCursor]}>
        <Icon name={playing || loading ? 'pause' : 'play'} size={22} color={color.onDark} />
      </Pressable>
      <View style={{
      flex: 1,
      gap: 6
    }}>
        <Text style={[type.body, {
        color: color.onDark,
        fontWeight: '600'
      }]}>
          {loading ? t("Ses yükleniyor…") : playing ? 'Dinleniyor…' : left > 0 ? t("Kaydı dinleyin") : t("Dinleme hakkınız doldu")}
        </Text>
        <Text style={[type.caption, {
        color: color.onDarkMuted
      }]}>
          {left > 0 ? t("{0} dinleme hakkınız kaldı", [left]) : t("Soruyu yanıtlayabilirsiniz")}{t(" · Durdurulan dinleme hakkınızdan düşer")}</Text>
        {error ? <Text style={[type.caption, {
        color: '#FCA5A5'
      }]}>{error}</Text> : null}
      </View>
      <View style={styles.dots}>
        {Array.from({
        length: MAX_PLAYS
      }, (_, i) => <View key={i} style={[styles.dot, {
        backgroundColor: i < plays ? color.gold : 'rgba(255,255,255,0.2)'
      }]} />)}
      </View>
    </View>;
}
function SpeakingRecorder({
  recorder
}: {
  recorder: RecorderState;
}) {
  const ring = 1 + recorder.level * 0.5;
  const ready = !!recorder.clip && !recorder.recording;
  return <View style={styles.speaking}>
      <View style={styles.micWrap}>
        <View style={[styles.micRing, {
        width: 104 * ring,
        height: 104 * ring,
        borderRadius: 52 * ring,
        opacity: recorder.recording ? 0.6 : 0
      }]} />
        <View style={[styles.mic, recorder.recording && {
        backgroundColor: color.plum
      }]}>
          <Icon name={recorder.recording ? 'waveform' : ready ? 'check' : 'mic'} size={36} color={recorder.recording ? color.onDark : color.plum} />
        </View>
      </View>
      <Text style={[type.heading, {
      color: color.ink
    }]}>
        {recorder.recording ? t("Sizi dinliyoruz.") : ready ? t("Kaydınız hazır.") : t("Söz sizde.")}
      </Text>
      <Text style={[type.small, {
      color: color.muted,
      textAlign: 'center'
    }]}>
        {recorder.recording ? t("{0} / {1} · Bitirdiğinizde kaydı durdurun.", [formatSeconds(recorder.seconds), formatSeconds(MAX_RECORDING_SECONDS)]) : ready ? t("{0} kaydedildi. Göndermeden önce yeniden kaydedebilirsiniz.", [formatSeconds((recorder.clip?.durationMs ?? 0) / 1000)]) : t("Hazır olduğunuzda kayda başlayın. En fazla {0} dakika.", [MAX_RECORDING_SECONDS / 60])}
      </Text>
      <Button label={recorder.recording ? t("Kaydı bitir") : ready ? t("Yeniden kaydet") : t("Kayda başla")} icon={recorder.recording ? 'stop' : 'mic'} variant={recorder.recording ? 'primary' : 'secondary'} loading={recorder.preparing} onPress={() => {
      B4Native.stopPlayback();
      recorder.recording ? recorder.stop() : recorder.start();
    }} style={{
      alignSelf: 'center'
    }} />
      {recorder.error ? <Message tone="error" text={recorder.error} /> : null}
    </View>;
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18
  },
  skillBadge: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressBox: {
    width: 200,
    gap: 8
  },
  split: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start'
  },
  prompt: {
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '600',
    color: color.ink,
    letterSpacing: -0.2
  },
  passage: {
    backgroundColor: color.canvas,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: color.line
  },
  passageTall: {
    backgroundColor: color.surface,
    borderRadius: 24,
    padding: 30
  },
  passageText: {
    fontSize: 17,
    lineHeight: 29,
    color: color.body,
    fontFamily: 'Georgia'
  },
  image: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    backgroundColor: color.canvas
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface
  },
  choiceSelected: {
    borderColor: color.plum,
    backgroundColor: color.wash
  },
  letter: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center'
  },
  letterText: {
    fontSize: 13,
    fontWeight: '700',
    color: color.muted
  },
  editor: {
    minHeight: 260,
    padding: 18,
    fontSize: 17,
    lineHeight: 26,
    color: color.ink,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.canvas
  },
  divider: {
    height: 1,
    backgroundColor: color.line
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: color.navy
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.plum,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dots: {
    flexDirection: 'row',
    gap: 6
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  speaking: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18
  },
  micWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center'
  },
  micRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: color.wash,
    borderWidth: 2,
    borderColor: color.plumSoft
  },
  mic: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
