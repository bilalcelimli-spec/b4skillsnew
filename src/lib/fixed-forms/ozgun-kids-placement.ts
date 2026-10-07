/** User-supplied first-use rules. These are course suggestions, not validated CEFR cut scores. */
export const OZGUN_PLACEMENT_VERSION = 'initial-course-rules-v1';
export const OZGUN_LEVELS = ['A1','A2','B1','B2','C1','C2'] as const;
export const OZGUN_COURSE_BANDS = [
  {min:0,max:23,label:'Başlangıç / A1',target:'A1'},
  {min:24,max:39,label:'A2 kur adayı',target:'A2'},
  {min:40,max:55,label:'B1 kur adayı',target:'B1'},
  {min:56,max:71,label:'B2 kur adayı',target:'B2'},
  {min:72,max:85,label:'C1 kur adayı',target:'C1'},
  {min:86,max:96,label:'C2 için ileri değerlendirme adayı',target:'C2'},
] as const;
type AnswerMap = Record<string,string|null>;
type Section = {skill:string;label:string;first:number;correct:number};
export function buildOzgunPlacement(answers:AnswerMap,key:string,sections:Section[],total:number,keyConfirmed:boolean) {
  const recommendation=OZGUN_COURSE_BANDS.find(band=>total>=band.min&&total<=band.max)!;
  const clusters=OZGUN_LEVELS.map((level,index)=>{
    const skills=sections.map(section=>{
      const first=section.first+index*4;
      const correct=Array.from({length:4},(_,i)=>answers[String(first+i)]===key[first+i-1]?1:0).reduce<number>((a,b)=>a+b,0);
      return {skill:section.skill,label:section.label,first,last:first+3,correct,total:4};
    });
    const correct=skills.reduce((sum,skill)=>sum+skill.correct,0);
    const strong=correct>=12&&skills.every(skill=>skill.correct>=2);
    const status=strong?'strong':correct>=12?'unbalanced':correct>=8?'partial':'insufficient';
    const label={strong:'Güçlü, bölümlere yayılmış kanıt',unbalanced:'Dengesiz performans; zayıf alanda ek değerlendirme',partial:'Kısmi / sınırda kanıt',insufficient:'Bu kümede yeterli kanıt yok'}[status];
    return {level,correct,total:16,skills,status,label};
  });
  const targetIndex=OZGUN_LEVELS.indexOf(recommendation.target);
  // The C2 band calls for separate C1/C2 review, not an invented prerequisite pass rule.
  const prerequisites=targetIndex>0&&targetIndex<5?clusters.slice(0,targetIndex):[];
  const missingPrerequisites=prerequisites.filter(cluster=>cluster.status!=='strong').map(cluster=>cluster.level);
  const checks:{code:string;message:string}[]=[];
  if(!keyConfirmed)checks.push({code:'unconfirmed-key',message:'Bu denemenin cevap anahtarı doğrulanmamış. Kur önerisi ön sonuçtur; önce anahtar kontrol edilmelidir.'});
  if(targetIndex===0)checks.push({code:'basic-task',message:'Temel anlama ve yönerge takibini kısa bireysel görevle kontrol edin.'});
  if(missingPrerequisites.length)checks.push({code:'cluster-mismatch',message:`Toplam puan önerisi ile ön koşul kümeleri uyuşmuyor (${missingPrerequisites.join(', ')}). Otomatik yerleştirme yapmayın; eksik alanı yeni bir görevle kontrol edin.`});
  // A boundary is between integer scores (e.g. 55/56). The supplied example is 54–57.
  for(let i=1;i<OZGUN_COURSE_BANDS.length;i++){
    const band=OZGUN_COURSE_BANDS[i];
    if(total>=band.min-2&&total<=band.min+1)checks.push({code:'near-boundary',message:`Eşiğe yakın sonuç (${band.min-2}–${band.min+1}): ${OZGUN_COURSE_BANDS[i-1].label} ve ${band.label} için kısa ek değerlendirme yapın.`});
  }
  const minimum=Math.min(...sections.map(section=>section.correct)),maximum=Math.max(...sections.map(section=>section.correct));
  if(maximum-minimum>=6)checks.push({code:'section-gap',message:`Bölümler arasında ${maximum-minimum} puan fark var. Düşük alanı (${sections.filter(section=>section.correct===minimum).map(section=>section.label).join(', ')}) ayrıca inceleyin.`});
  if(clusters[0].status!=='strong')checks.push({code:'a1-review',message:'A1 kanıtı yeterince güçlü değil. “A1 altı” kararı vermeyin; yönerge anlama, sınav deneyimi ve temel anlamayı kontrol edin.'});
  const unbalanced=clusters.filter(cluster=>cluster.status==='unbalanced');
  if(unbalanced.length)checks.push({code:'unbalanced-clusters',message:`${unbalanced.map(cluster=>cluster.level).join(', ')} kümelerinde yüksek toplamın yanında bölüm başına 0–1/4 var. Zayıf alanlarda ek değerlendirme yapın.`});
  if(targetIndex>=4)checks.push({code:'advanced-assessment',message:targetIndex===5
    ?'C1 ve C2 kümelerini ayrıca inceleyin. Konuşma, yazma ve daha kapsamlı okuma/dinleme değerlendirmesi olmadan C2 kararı vermeyin.'
    :'C1 adaylığını ek konuşma/yazma ve daha kapsamlı okuma/dinleme görevleriyle doğrulayın.'});
  checks.push({code:'two-week-follow-up',message:'Yerleştirme sonrası ilk iki haftada ders içi performansa göre kur uygunluğunu yeniden değerlendirin.'});
  return {version:OZGUN_PLACEMENT_VERSION,recommendation,clusters,checks,missingPrerequisites,
    provisional:true,validatedCefr:false,automaticPlacement:false,humanReviewRequired:true};
}
