import { Text } from "../i18n/Text";
import { t } from "../i18n/core";
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { CameraPreview } from './CameraPreview';
import type { Backend } from '../api';
import { useCameraEvidence } from '../proctoring/useCameraEvidence';
import { Button, Card, Eyebrow, Message } from './ui';
import { color, type } from '../theme';
import type { PhotoDelivery } from '../proctoring/usePhotoQueue';
import type { FaceObservation } from '../proctoring/faceMonitor';
type Props = {
  backend: Backend;
  sessionId: string;
  delivery: PhotoDelivery;
  recordFace: (event: FaceObservation) => Promise<void>;
};

export function CameraEvidenceCard({
  backend,
  sessionId,
  delivery,
  recordFace
}: Props) {
  const [policy, setPolicy] = useState<{
    enabled: boolean;
    retentionDays: number;
  } | null>(null);
  const [policyError, setPolicyError] = useState(false);
  useEffect(() => {
    let current = true;
    backend.cameraPolicy(sessionId).then(p => {
      if (current) setPolicy(p);
    }, () => {
      if (current) setPolicyError(true);
    });
    return () => {
      current = false;
    };
  }, [backend, sessionId]);
  if (policyError) return <Message text={t("Kamera pilotunun durumu alınamadı. Bu özellik için bağlantıyı kontrol edip oturumu yeniden açın.")} />;
  if (!policy?.enabled) return null;
  return <CameraCapture key={sessionId} backend={backend} sessionId={sessionId} retentionDays={policy.retentionDays} delivery={delivery} recordFace={recordFace} />;
}
function CameraCapture({
  backend,
  sessionId,
  retentionDays,
  delivery,
  recordFace
}: Props & {
  retentionDays: number;
}) {
  const camera = useCameraEvidence(backend, sessionId, delivery, recordFace);
  return <Card><View style={{
      gap: 14
    }}>
    <Eyebrow>{t("Kamera kontrolü · Pilot")}</Eyebrow>
    <Text style={[type.heading, {
        color: color.ink
      }]}>{t("Kamera ve yüz kontrolü")}</Text>
    <Text style={[type.small, {
        color: color.muted
      }]}>{t("Kamera yalnızca siz açtığınızda çalışır. Fotoğrafı gördükten sonra göndermeyi seçersiniz. Kamera açıkken sürekli yüz sayımı cihazda yapılır; video kareleri gönderilmez. Beş saniye yüz yokluğu veya üç saniye birden fazla yüz teknik gözlem olarak kaydedilir; kimliğinizi doğrulamaz ve ihlal kararı vermez. Canlı görüşme ve ortam sesi kaydı yoktur. Gönderilen fotoğrafa yetkili kurum inceleyicileri ")}{retentionDays}{t(" gün erişebilir.")}</Text>
    {camera.preview ? <><CameraPreview style={{
          height: 300,
          width: '100%'
        }} /><Text accessibilityLiveRegion="polite" style={[type.small, {
          color: color.muted
        }]}>{t("Sürekli yüz sayımı açık · ")}{camera.faceCount === null ? t("Ölçüm bekleniyor / ölçüm alınamadı") : t("Görünen yüz: {0}", [camera.faceCount])}</Text></> : null}
    {camera.photo ? <>
      <Image source={{
          uri: `data:image/jpeg;base64,${camera.photo.base64}`
        }} style={{
          height: 300,
          width: '100%'
        }} resizeMode="contain" accessibilityLabel={t("Gönderilecek fotoğrafın önizlemesi")} />
      <Text style={[type.small, {
          color: camera.photo.faceCount === 1 ? color.muted : color.warning
        }]}>{t("Görünen yüz sayısı: ")}{camera.photo.faceCount}. {camera.photo.faceCount === 1 ? t("Fotoğrafı kontrol edip gönderebilirsiniz.") : t("Yalnız bir yüz görünmeli; ışığı ve kadrajı düzenleyip yeniden çekin.")}</Text>
      <Text style={[type.caption, {
          color: color.muted
        }]}>{t("Onaylanmamış fotoğraf yalnız bellekte kalır. Onaydan sonra cihazda şifreli saklanır; bağlantı gelince aynı kimlikle yeniden gönderilir. İlk teslim için 10 dakika vardır; süre aşılırsa yeniden çekin.")}</Text>
    </> : null}
    {camera.error ? <Message tone="error" text={camera.error} /> : null}
    {camera.delivered ? <Message text={t("Onaylanan fotoğraf şifreli kaydedildi. Sunucu teslimi onayladığında kuyruktan kaldırılır; aksi halde bekleyen fotoğraflar bölümünde görünür.")} /> : null}
    <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
      }}>
      {!camera.preview ? <Button label={camera.photo ? t("Yeniden çek") : t("Kamerayı aç")} onPress={camera.start} disabled={camera.busy} variant="secondary" /> : <>
        <Button label={t("Fotoğraf çek")} onPress={camera.capture} disabled={camera.busy} />
        <Button label={t("Kamerayı kapat")} onPress={camera.stop} disabled={camera.busy} variant="ghost" />
      </>}
      {camera.photo ? <Button label={t("Fotoğrafı onayla ve gönder")} onPress={camera.send} disabled={camera.busy || camera.photo.faceCount !== 1} loading={camera.busy} /> : null}
    </View>
  </View></Card>;
}
