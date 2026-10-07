import type { scoreFixedForm } from './ozgun-kids';

export type OzgunReport = ReturnType<typeof scoreFixedForm> & { securityHold?: boolean };

export const OZGUN_SKILL_GUIDANCE: Record<string, { title: string; description: string; practice: string; color: string }> = {
  GRAMMAR: {title:'Dil bilgisi',description:'Cümle yapıları ve dil bilgisi kullanımı',practice:'Kısa cümleler kurun; olumlu, olumsuz ve soru biçimlerini birlikte çalışın. Seçimlerinizi bir öğretmenle açıklayın.',color:'#8b5cf6'},
  VOCABULARY: {title:'Kelime bilgisi',description:'Sözcükleri ve ifadeleri bağlamda anlama',practice:'Yeni sözcükleri tek başına ezberlemek yerine bir görsel, örnek cümle ve günlük bir durumla eşleştirin.',color:'#db2777'},
  READING: {title:'Okuma',description:'Yazılı metinden anlam ve bilgi çıkarma',practice:'Kısa bir metinde kişi, yer, zaman ve ana fikir bilgilerini işaretleyin. Her cevabın dayandığı cümleyi gösterin.',color:'#2563eb'},
  LISTENING: {title:'Dinleme',description:'Konuşulan İngilizceden bilgi çıkarma',practice:'Kısa bir kayıtta önce ana fikri, sonra ad, sayı, saat ve yer bilgilerini not edin. Alıştırma sırasında tekrar dinleyip notlarınızı karşılaştırın.',color:'#0891b2'},
};

/** Describe observed raw scores only; do not infer a skill level or an error diagnosis. */
export function ozgunReportInsights(report: OzgunReport) {
  const answered = report.correct + report.wrong;
  const scores = report.sections.map(section => section.correct);
  const minimum = Math.min(...scores), maximum = Math.max(...scores);
  const tied = minimum === maximum;
  const highest = answered > 0 && maximum > 0 && !tied ? report.sections.filter(section => section.correct === maximum) : [];
  const focus = answered > 0 && !tied ? report.sections.filter(section => section.correct === minimum) : [];
  const practice = focus.length ? focus : report.sections;
  return {answered, completionPercent: Math.round(answered / report.total * 100), gap: maximum - minimum,
    highest, focus, practice, tied, noAnswers: answered === 0,
    strongClusters: report.placement?.clusters.filter(cluster => cluster.status === 'strong') ?? [],
    beforePlacement: report.placement?.checks.filter(check => check.code !== 'two-week-follow-up') ?? [],
  };
}
