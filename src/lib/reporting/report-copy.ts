/**
 * Bilingual (EN/TR) copy for the printable score report and certificate.
 *
 * Can-do statements are short platform paraphrases of the CEFR Companion
 * Volume (Council of Europe, 2020) overall scales for each mode. They describe
 * what is typical at a level, not abilities observed item-by-item in this test.
 * Grammar and vocabulary lines match the paraphrases in skill-level-guide.ts.
 */
import type { CefrLevel } from '../cefr/cefr-framework.js';
import type { ReportSkill } from './assessment-report-model.js';

export type ReportLocale = 'en' | 'tr';
type Pair = { en: string; tr: string };

export const LEVEL_ORDER: CefrLevel[] = ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const levelLabel = (level: CefrLevel | null | undefined) => !level ? '—' : level === 'PRE_A1' ? 'Pre-A1' : level;

export const SKILL_LABEL: Record<ReportSkill, Pair> = {
  LISTENING: { en: 'Listening', tr: 'Dinleme' },
  READING: { en: 'Reading', tr: 'Okuma' },
  GRAMMAR: { en: 'Grammar', tr: 'Dil bilgisi' },
  VOCABULARY: { en: 'Vocabulary', tr: 'Kelime' },
  WRITING: { en: 'Writing', tr: 'Yazma' },
  SPEAKING: { en: 'Speaking', tr: 'Konuşma' },
};

export const GROUP_LABEL: Record<'Basic' | 'Independent' | 'Proficient', Pair> = {
  Basic: { en: 'Basic user', tr: 'Temel kullanıcı' },
  Independent: { en: 'Independent user', tr: 'Bağımsız kullanıcı' },
  Proficient: { en: 'Proficient user', tr: 'Yetkin kullanıcı' },
};

export const LEVEL_SUMMARY: Record<CefrLevel, Pair> = {
  PRE_A1: { en: 'Recognises a small number of familiar words and rehearsed phrases.', tr: 'Bildik az sayıda kelimeyi ve ezber kalıpları tanır.' },
  A1: { en: 'Understands and uses familiar everyday expressions and very basic phrases.', tr: 'Günlük, bildik ifadeleri ve çok temel kalıpları anlar ve kullanır.' },
  A2: { en: 'Understands frequently used expressions and handles simple, routine exchanges.', tr: 'Sık kullanılan ifadeleri anlar; basit, rutin konuşmaları yürütür.' },
  B1: { en: 'Deals with most familiar situations and describes experiences, plans and opinions simply.', tr: 'Bildik durumların çoğunu idare eder; deneyim, plan ve görüşlerini basitçe anlatır.' },
  B2: { en: 'Understands the main ideas of complex texts and interacts with a good degree of fluency.', tr: 'Karmaşık metinlerin ana fikirlerini anlar; oldukça akıcı biçimde etkileşim kurar.' },
  C1: { en: 'Uses the language flexibly and effectively for social, academic and professional purposes.', tr: 'Dili sosyal, akademik ve mesleki amaçlarla esnek ve etkili kullanır.' },
  C2: { en: 'Understands virtually everything and expresses meaning precisely, even in complex situations.', tr: 'Neredeyse her şeyi anlar; karmaşık durumlarda bile anlamı kesin biçimde ifade eder.' },
};

const CAN_DO: Record<ReportSkill, Record<CefrLevel, Pair>> = {
  LISTENING: {
    PRE_A1: { en: 'Can recognise familiar words spoken slowly and clearly, with pictures or gestures.', tr: 'Yavaş ve net söylenen, resim ya da jestle desteklenen bildik kelimeleri tanır.' },
    A1: { en: 'Can follow slow, carefully articulated speech with long pauses to take in meaning.', tr: 'Yavaş, özenle söylenen ve uzun duraklamalı konuşmayı takip eder.' },
    A2: { en: 'Can understand phrases and expressions about areas of immediate priority when speech is clear and slow.', tr: 'Konuşma net ve yavaş olduğunda yakın çevreyle ilgili kalıp ve ifadeleri anlar.' },
    B1: { en: 'Can understand the main points of clear standard speech on familiar matters.', tr: 'Bildik konulardaki net, standart konuşmanın ana noktalarını anlar.' },
    B2: { en: 'Can understand the main ideas of extended speech on concrete and abstract topics in standard language.', tr: 'Somut ve soyut konulardaki uzun, standart konuşmaların ana fikirlerini anlar.' },
    C1: { en: 'Can follow extended speech on abstract and complex topics, even when it is not clearly structured.', tr: 'Açıkça yapılandırılmamış olsa bile soyut ve karmaşık konulardaki uzun konuşmaları takip eder.' },
    C2: { en: 'Can understand any kind of spoken language, live or broadcast, at natural speed.', tr: 'Canlı ya da kayıtlı her türlü konuşmayı doğal hızda anlar.' },
  },
  READING: {
    PRE_A1: { en: 'Can recognise familiar names, words and very short phrases supported by pictures.', tr: 'Resimle desteklenen bildik adları, kelimeleri ve çok kısa kalıpları tanır.' },
    A1: { en: 'Can understand very short, simple texts a single phrase at a time.', tr: 'Çok kısa ve basit metinleri ifade ifade anlar.' },
    A2: { en: 'Can understand short, simple texts on familiar matters of a concrete type.', tr: 'Bildik, somut konulardaki kısa ve basit metinleri anlar.' },
    B1: { en: 'Can read straightforward factual texts on familiar subjects with a satisfactory level of comprehension.', tr: 'Bildik konulardaki açık, bilgi veren metinleri yeterli düzeyde anlar.' },
    B2: { en: 'Can read with a large degree of independence, adapting style and speed to different texts.', tr: 'Farklı metinlere göre okuma hızını ve yöntemini ayarlayarak büyük ölçüde bağımsız okur.' },
    C1: { en: 'Can understand long and complex texts in detail, including outside their own field.', tr: 'Kendi alanı dışındakiler dahil uzun ve karmaşık metinleri ayrıntılı olarak anlar.' },
    C2: { en: 'Can understand virtually all forms of written language, including abstract and structurally complex texts.', tr: 'Soyut ve yapıca karmaşık metinler dahil yazılı dilin hemen her biçimini anlar.' },
  },
  GRAMMAR: {
    PRE_A1: { en: 'Recognises a few rehearsed sentence patterns; wider control is not established.', tr: 'Ezberlenmiş birkaç cümle kalıbını tanır; daha geniş bir denetim henüz oluşmamıştır.' },
    A1: { en: 'Uses a small set of learned structures with limited control.', tr: 'Öğrendiği az sayıda yapıyı sınırlı bir denetimle kullanır.' },
    A2: { en: 'Uses basic patterns; systematic errors remain common.', tr: 'Temel kalıpları kullanır; sistematik hatalar hâlâ yaygındır.' },
    B1: { en: 'Controls familiar patterns reasonably well; errors remain in more complex expression.', tr: 'Bildik kalıpları oldukça iyi kullanır; daha karmaşık anlatımda hatalar sürer.' },
    B2: { en: 'Shows good grammatical control; occasional slips usually preserve meaning.', tr: 'Dil bilgisini iyi denetler; ara sıra yapılan hatalar genelde anlamı bozmaz.' },
    C1: { en: 'Maintains high accuracy across varied, complex expression.', tr: 'Çeşitli ve karmaşık anlatımda yüksek doğruluğu korur.' },
    C2: { en: 'Sustains control of complex language even while managing demanding communication.', tr: 'Zorlu iletişim sırasında bile karmaşık dil üzerindeki denetimini sürdürür.' },
  },
  VOCABULARY: {
    PRE_A1: { en: 'Recognises a few personally relevant words; wider range is not established.', tr: 'Kendisiyle ilgili birkaç kelimeyi tanır; daha geniş bir dağarcık henüz oluşmamıştır.' },
    A1: { en: 'Uses basic words and phrases for concrete needs.', tr: 'Somut ihtiyaçlar için temel kelime ve kalıpları kullanır.' },
    A2: { en: 'Has sufficient everyday vocabulary for routine exchanges.', tr: 'Rutin konuşmalar için yeterli günlük kelime bilgisine sahiptir.' },
    B1: { en: 'Handles familiar topics, sometimes explaining around missing words.', tr: 'Bildik konuları idare eder; bilmediği kelimeyi zaman zaman dolaylı anlatır.' },
    B2: { en: 'Has broad vocabulary for general topics; occasional word-choice errors remain.', tr: 'Genel konular için geniş bir kelime dağarcığı vardır; ara sıra kelime seçimi hataları olur.' },
    C1: { en: 'Uses a wide repertoire with flexible phrasing and generally accurate choice.', tr: 'Geniş bir dağarcığı esnek ve genellikle doğru seçimlerle kullanır.' },
    C2: { en: 'Uses nuanced, idiomatic vocabulary with strong precision.', tr: 'İnce anlam farkları ve deyimlerle, yüksek kesinlikte kelime kullanır.' },
  },
  WRITING: {
    PRE_A1: { en: 'Can copy familiar words and write basic personal details such as their name.', tr: 'Bildik kelimeleri kopyalar ve adı gibi temel kişisel bilgileri yazar.' },
    A1: { en: 'Can write simple isolated phrases and sentences about themselves.', tr: 'Kendisi hakkında basit, tek tek ifade ve cümleler yazar.' },
    A2: { en: 'Can write a series of simple phrases and sentences linked with simple connectors like "and", "but" and "because".', tr: '"and", "but", "because" gibi basit bağlaçlarla birbirine bağlanan kısa cümleler yazar.' },
    B1: { en: 'Can write straightforward connected text on familiar topics by linking shorter elements into a sequence.', tr: 'Bildik konularda kısa parçaları sıraya koyarak bağlantılı, açık metinler yazar.' },
    B2: { en: 'Can write clear, detailed texts on a variety of subjects, synthesising and evaluating information and arguments.', tr: 'Çeşitli konularda bilgi ve argümanları birleştirip değerlendiren açık, ayrıntılı metinler yazar.' },
    C1: { en: 'Can write clear, well-structured texts on complex subjects, supporting points with reasons and examples.', tr: 'Karmaşık konularda gerekçe ve örneklerle desteklenmiş açık, iyi yapılandırılmış metinler yazar.' },
    C2: { en: 'Can write clear, smoothly flowing, complex texts in an appropriate and effective style.', tr: 'Uygun ve etkili bir üslupla açık, akıcı ve karmaşık metinler yazar.' },
  },
  SPEAKING: {
    PRE_A1: { en: 'Can say rehearsed words and short phrases about personal details.', tr: 'Kişisel bilgileri hakkında ezberlediği kelime ve kısa kalıpları söyler.' },
    A1: { en: 'Can produce simple, mainly isolated phrases about people and places.', tr: 'İnsanlar ve yerler hakkında basit, çoğunlukla tek tek ifadeler kurar.' },
    A2: { en: 'Can describe people, routines and likes or dislikes in a short list of simple phrases.', tr: 'İnsanları, günlük işleri ve sevdiklerini kısa, basit ifadelerle anlatır.' },
    B1: { en: 'Can reasonably fluently sustain a straightforward description of a familiar subject.', tr: 'Bildik bir konuyu oldukça akıcı biçimde, açık bir şekilde anlatmayı sürdürür.' },
    B2: { en: 'Can give clear, detailed descriptions and explain a viewpoint on familiar topics.', tr: 'Bildik konularda açık, ayrıntılı anlatımlar yapar ve bir görüşü açıklar.' },
    C1: { en: 'Can give clear, detailed descriptions of complex subjects, developing points and ending appropriately.', tr: 'Karmaşık konuları açık ve ayrıntılı anlatır, noktaları geliştirir ve uygun biçimde bağlar.' },
    C2: { en: 'Can produce clear, smoothly flowing, well-structured speech with an effective logical structure.', tr: 'Etkili mantıksal yapısı olan açık, akıcı ve iyi kurgulanmış konuşmalar yapar.' },
  },
};

export function canDo(skill: ReportSkill, level: CefrLevel, locale: ReportLocale): string {
  return CAN_DO[skill][level][locale];
}

/** Next CEFR descriptor for the same skill, framed as a learning target. */
export function nextTarget(skill: ReportSkill, level: CefrLevel, locale: ReportLocale): { level: CefrLevel | null; text: string } {
  const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1] ?? null;
  if (!next) return { level: null, text: locale === 'tr' ? 'Zorlu ve alışılmadık bağlamlarda kesinlik ve esnekliği koruyun.' : 'Maintain precision and flexibility across unfamiliar, demanding contexts.' };
  return { level: next, text: CAN_DO[skill][next][locale] };
}

export const PRACTICE_ACTION: Record<ReportSkill, Pair> = {
  READING: { en: 'Read a short article. Identify the main point, the supporting details and the evidence for each answer.', tr: 'Kısa bir makale okuyun. Ana fikri, destekleyici ayrıntıları ve her cevabın metindeki kanıtını bulun.' },
  LISTENING: { en: 'Listen to a short recording without a transcript, note the main idea and key details, then check with the transcript.', tr: 'Kısa bir kaydı metne bakmadan dinleyin; ana fikri ve önemli ayrıntıları not edin, sonra metinle kontrol edin.' },
  WRITING: { en: 'Write a response with a clear purpose and organised paragraphs; revise it for task coverage, grammar and cohesion.', tr: 'Amacı belli, paragrafları düzenli bir metin yazın; görevi karşılama, dil bilgisi ve bağlantı açısından gözden geçirin.' },
  SPEAKING: { en: 'Record a short answer on a familiar topic, listen back for clarity and pauses, then record an improved version.', tr: 'Bildik bir konuda kısa bir cevap kaydedin; netlik ve duraklamalar için dinleyin, sonra daha iyi bir sürüm kaydedin.' },
  GRAMMAR: { en: 'Keep an error log. Correct each sentence, explain the rule and write two new examples in context.', tr: 'Bir hata defteri tutun. Her cümleyi düzeltin, kuralı açıklayın ve bağlam içinde iki yeni örnek yazın.' },
  VOCABULARY: { en: 'Collect useful phrases and collocations from reading or listening, use them in new sentences and review them regularly.', tr: 'Okuduklarınızdan ve dinlediklerinizden kullanışlı kalıplar toplayın; yeni cümlelerde kullanıp düzenli tekrar edin.' },
};

export const RUBRIC_LABEL: Record<string, Pair> = {
  taskRelevance: { en: 'Task achievement', tr: 'Görevi yerine getirme' },
  coherence: { en: 'Organisation & coherence', tr: 'Düzen ve tutarlılık' },
  grammar: { en: 'Grammatical range & accuracy', tr: 'Dil bilgisi çeşitliliği ve doğruluğu' },
  vocabulary: { en: 'Vocabulary range & accuracy', tr: 'Kelime çeşitliliği ve doğruluğu' },
  fluency: { en: 'Fluency', tr: 'Akıcılık' },
};

export const UI: Record<string, Pair> = {
  certificateTitle: { en: 'Certificate of English Proficiency', tr: 'İngilizce Yeterlik Sertifikası' },
  certifies: { en: 'This is to certify that', tr: 'Bu belge,' },
  achieved: { en: 'has demonstrated an overall English level of', tr: 'adlı adayın genel İngilizce seviyesinin' },
  achievedPost: { en: '.', tr: ' olduğunu belgeler.' },
  achievedPostYL: { en: '.', tr: ' olduğunu gösterir.' },
  achievedYL: { en: 'has shown an overall English level of', tr: 'adlı öğrencinin genel İngilizce seviyesinin' },
  onThe: { en: 'on the', tr: 'Sınav' },
  testDate: { en: 'Test date', tr: 'Sınav tarihi' },
  test: { en: 'Assessment', tr: 'Sınav' },
  validUntil: { en: 'Valid until', tr: 'Geçerlilik' },
  certificateId: { en: 'Certificate ID', tr: 'Sertifika no' },
  verifyAt: { en: 'Verify online', tr: 'Çevrim içi doğrulayın' },
  scanToVerify: { en: 'Scan to verify', tr: 'Doğrulamak için okutun' },
  issuedBy: { en: 'Issued by', tr: 'Düzenleyen' },
  poweredBy: { en: 'Assessment by b4skills', tr: 'Ölçme: b4skills' },
  indicative: { en: 'Indicative alignment with other tests', tr: 'Diğer sınavlarla yaklaşık karşılık' },
  indicativeYL: { en: 'Comparable level for young learners', tr: 'Küçük yaş grubu için karşılaştırılabilir seviye' },
  notOfficial: { en: 'Not an official score', tr: 'Resmî puan değildir' },
  sources: { en: 'Sources', tr: 'Kaynaklar' },
  cefrLevel: { en: 'CEFR level', tr: 'CEFR seviyesi' },
  overall: { en: 'Overall', tr: 'Genel' },
  scaleScore: { en: 'b4skills score', tr: 'b4skills puanı' },
  scaleNote: { en: 'Platform scale 0–1000 (BEPS), not percent correct', tr: 'Platform ölçeği 0–1000 (BEPS); doğru yüzdesi değildir' },
  reportTitle: { en: 'Score Report', tr: 'Sonuç Raporu' },
  candidateReport: { en: 'Candidate score report', tr: 'Aday sonuç raporu' },
  studentReport: { en: 'Student score report', tr: 'Öğrenci sonuç raporu' },
  candidate: { en: 'Candidate', tr: 'Aday' },
  student: { en: 'Student', tr: 'Öğrenci' },
  status: { en: 'Status', tr: 'Durum' },
  skillProfile: { en: 'Skill profile', tr: 'Beceri profili' },
  skillProfileLead: { en: 'Each skill is estimated separately. The dot is the estimate; the shaded band is the 95% measurement interval.', tr: 'Her beceri ayrı ayrı kestirilir. Nokta kestirimi, gölgeli bant %95 ölçme aralığını gösterir.' },
  precision: { en: 'Precision', tr: 'Ölçme hassasiyeti' },
  sem: { en: 'SEM', tr: 'SEM' },
  interval: { en: '95% interval', tr: '%95 aralık' },
  items: { en: 'Tasks', tr: 'Görev' },
  notAssessed: { en: 'Not assessed', tr: 'Ölçülmedi' },
  scoringPending: { en: 'Scoring pending', tr: 'Puanlama sürüyor' },
  unavailable: { en: 'Result unavailable', tr: 'Sonuç yok' },
  whatYouCanDo: { en: 'What this level typically means', tr: 'Bu seviye genellikle ne anlama gelir' },
  canDoLead: { en: 'Typical CEFR descriptors for each reported skill level — not a claim that every ability was observed in this test.', tr: 'Her becerinin raporlanan seviyesine ait tipik CEFR tanımları; her yeterliğin bu sınavda tek tek gözlendiği anlamına gelmez.' },
  nextTarget: { en: 'Next target', tr: 'Sonraki hedef' },
  strengths: { en: 'Strengths', tr: 'Güçlü yönler' },
  nextSteps: { en: 'Next steps', tr: 'Sonraki adımlar' },
  strengthsLead: { en: 'Your highest reported skill levels.', tr: 'Raporlanan en yüksek beceri seviyeleri.' },
  nextStepsLead: { en: 'General study guidance for the lowest reported skills; not an item-level diagnosis.', tr: 'En düşük raporlanan beceriler için genel çalışma önerisi; soru bazlı bir tanı değildir.' },
  rubric: { en: 'Writing and speaking: rubric profile', tr: 'Yazma ve konuşma: değerlendirme ölçütleri' },
  rubricLead: { en: 'Average analytic ratings (0–10) across scored tasks. Ratings come from AI scoring with a second, independent verifier pass; uncertain responses go to human raters.', tr: 'Puanlanan görevlerde analitik puanların ortalaması (0–10). Yapay zekâ puanlaması ve bağımsız ikinci bir doğrulama geçişiyle verilir; emin olunamayan yanıtlar insan değerlendiriciye gider.' },
  rubricNone: { en: 'No scored writing or speaking tasks in this assessment.', tr: 'Bu sınavda puanlanmış yazma veya konuşma görevi yok.' },
  tasksScored: { en: 'tasks scored', tr: 'görev puanlandı' },
  testInfo: { en: 'About this assessment', tr: 'Sınav hakkında' },
  product: { en: 'Product', tr: 'Ürün' },
  date: { en: 'Date', tr: 'Tarih' },
  duration: { en: 'Duration', tr: 'Süre' },
  minutes: { en: 'min', tr: 'dk' },
  method: { en: 'Method', tr: 'Yöntem' },
  sections: { en: 'Sections', tr: 'Bölümler' },
  ageGroup: { en: 'Age group', tr: 'Yaş grubu' },
  levelRange: { en: 'Reported range', tr: 'Ölçülen aralık' },
  itemsAdministered: { en: 'Scored tasks', tr: 'Puanlanan görev' },
  methodCat: { en: 'Computer-adaptive (IRT); each answer sets the difficulty of the next task.', tr: 'Bilgisayar uyarlamalı (IRT); her cevap bir sonraki görevin zorluğunu belirler.' },
  methodMst: { en: 'Computer-adaptive (IRT) with multistage routing for production tasks.', tr: 'Bilgisayar uyarlamalı (IRT); üretim görevlerinde çok aşamalı yönlendirme.' },
  measurement: { en: 'Measurement and responsible use', tr: 'Ölçme ve doğru kullanım' },
  verification: { en: 'Verification', tr: 'Doğrulama' },
  verificationLead: { en: 'Scan the code or open the link to confirm this result with b4skills.', tr: 'Bu sonucu b4skills üzerinden doğrulamak için kodu okutun veya bağlantıyı açın.' },
  noVerification: { en: 'No verification link has been issued for this report yet.', tr: 'Bu rapor için henüz doğrulama bağlantısı oluşturulmadı.' },
  reportId: { en: 'Report ID', tr: 'Rapor no' },
  assessmentId: { en: 'Assessment ID', tr: 'Sınav no' },
  generated: { en: 'Generated', tr: 'Oluşturulma' },
  page: { en: 'Page', tr: 'Sayfa' },
  confidential: { en: 'Confidential candidate report', tr: 'Kişiye özel sonuç raporu' },
  provisional: { en: 'PROVISIONAL — scoring or review is not complete. Not a final result.', tr: 'GEÇİCİ — puanlama veya inceleme tamamlanmadı. Kesin sonuç değildir.' },
  sample: { en: 'SAMPLE — fictional data for design review. Not a valid result.', tr: 'ÖRNEK — tasarım incelemesi için kurgusal veri. Geçerli bir sonuç değildir.' },
  equivalenceHidden: { en: 'Alignments are shown only for a final result.', tr: 'Karşılıklar yalnızca kesinleşmiş sonuç için gösterilir.' },
  cutScoreNote: { en: 'CEFR levels use the platform’s provisional cut scores (standard setting in progress). Use additional evidence for high-stakes decisions.', tr: 'CEFR seviyeleri platformun geçici kesme puanlarına dayanır (standart belirleme çalışması sürüyor). Yüksek riskli kararlarda ek kanıt kullanın.' },
  uncertaintyNote: { en: 'Every test score contains measurement error. The 95% interval shows the range in which the true level is likely to lie.', tr: 'Her sınav puanı ölçme hatası içerir. %95 aralık, gerçek seviyenin büyük olasılıkla bulunduğu aralığı gösterir.' },
  thetaNote: { en: 'Technical detail', tr: 'Teknik ayrıntı' },
  levelLadder: { en: 'CEFR level scale', tr: 'CEFR seviye ölçeği' },
  of: { en: 'of', tr: '/' },
  years: { en: 'years', tr: 'yaş' },
};

export const t = (key: keyof typeof UI, locale: ReportLocale) => UI[key][locale];
