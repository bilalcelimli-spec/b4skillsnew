import React from 'react';
import { OZGUN_TITLE } from '../lib/fixed-forms/ozgun-kids';
import { ArrowLeft, ArrowUpRight, BookOpen, CheckCircle2, ClipboardCheck, Clock3, Headphones, Info, Layers3, Printer, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { Button } from './ui/Button';
import { OZGUN_COURSE_BANDS } from '../lib/fixed-forms/ozgun-kids-placement';
import { OZGUN_SKILL_GUIDANCE, ozgunReportInsights, type OzgunReport } from '../lib/fixed-forms/ozgun-report-insights';

const STATUS: Record<string, {title:string; className:string; description:string}> = {
  strong: {title:'Güçlü kanıt',className:'bg-emerald-50 text-emerald-800 border-emerald-200',description:'En az 12/16 doğru ve dört bölümün her birinde en az 2/4 doğru.'},
  partial: {title:'Kısmi kanıt',className:'bg-amber-50 text-amber-800 border-amber-200',description:'8–11/16 doğru. Bu küme için kısa ek görevlerle kanıtı tamamlayın.'},
  insufficient: {title:'Yeterli kanıt yok',className:'bg-slate-100 text-slate-600 border-slate-200',description:'0–7/16 doğru. Bu sonuç, tek başına öğrencinin o düzeyin altında olduğunu göstermez.'},
  unbalanced: {title:'Dengesiz kanıt',className:'bg-orange-50 text-orange-800 border-orange-200',description:'En az 12/16 doğru var; ancak bir veya daha fazla bölümde yalnız 0–1/4 doğru bulunuyor.'},
};
const CHECK_TITLES: Record<string,string> = {
  'unconfirmed-key':'Cevap anahtarını doğrulayın', 'basic-task':'Temel anlama görevini uygulayın',
  'cluster-mismatch':'Toplam puan ve kümeler uyuşmuyor', 'near-boundary':'İki komşu kuru birlikte değerlendirin',
  'section-gap':'Bölümler arasındaki farkı inceleyin', 'a1-review':'Temel anlama kanıtını tamamlayın',
  'unbalanced-clusters':'Dengesiz kümeleri kontrol edin', 'advanced-assessment':'İleri düzey adaylığını ek görevlerle doğrulayın',
};
const card = 'report-card rounded-2xl border border-slate-200 bg-white shadow-sm';
const icons: Record<string,React.ReactNode> = {GRAMMAR:<BookOpen size={18}/>,VOCABULARY:<Sparkles size={18}/>,READING:<BookOpen size={18}/>,LISTENING:<Headphones size={18}/>};

export function OzgunKidsReport({report,candidateName,completedAt,onClose}:{report:OzgunReport;candidateName?:string;completedAt?:string;onClose?:()=>void}) {
  const insight = ozgunReportInsights(report);
  const placement = report.placement;
  const date = completedAt ? new Date(completedAt) : null;
  const held = report.securityHold || !report.keyConfirmed;
  const status = report.securityHold ? 'Güvenlik incelemesinde' : !report.keyConfirmed ? 'Ön sonuç · anahtar kontrolü gerekli' : 'Kur kararı için öğretmen değerlendirmesi gerekli';
  const names = (sections: typeof report.sections) => sections.map(section => OZGUN_SKILL_GUIDANCE[section.skill]?.title ?? section.label).join(', ');

  return <main data-testid="ozgun-score-report" className="ozgun-kids-report mx-auto max-w-6xl space-y-6 p-4 sm:p-6 text-slate-900 break-words">
    <style>{`@media print {
      @page { size: A4; margin: 12mm; }
      .ozgun-kids-report { max-width: none; padding: 0; font-size: 10pt; }
      .ozgun-kids-report .report-card { break-inside: avoid; box-shadow: none; }
      .ozgun-kids-report > header { display: flex !important; }
      .ozgun-kids-report h2, .ozgun-kids-report h3 { break-after: avoid; }
      .ozgun-kids-report .cluster-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); }
      .ozgun-kids-report .report-hero { background: white; color: #0f172a; border: 1px solid #cbd5e1; }
      .ozgun-kids-report .report-hero p { color: inherit; }
      .ozgun-kids-report * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }`}</style>

    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold tracking-widest text-indigo-600 uppercase mb-2">B4Skills · Öğrenci değerlendirme raporu</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{OZGUN_TITLE} sonuçları</h1>
        <p className="text-sm text-slate-500 mt-2">{candidateName || 'Öğrenci'}{date && Number.isFinite(date.getTime()) ? ` · ${date.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}` : ''} · 96 soru · 4 bölüm</p>
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">
        {onClose&&<Button variant="outline" onClick={onClose} className="gap-2"><ArrowLeft size={16}/>Geri dön</Button>}
        <Button variant="outline" onClick={()=>window.print()} className="gap-2"><Printer size={16}/>Yazdır</Button>
      </div>
    </header>

    <div className={`flex items-start gap-3 rounded-xl border p-4 ${held ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-indigo-50 border-indigo-100 text-indigo-950'}`} role={held ? 'alert' : 'note'}>
      {held ? <ShieldAlert className="shrink-0 mt-0.5" size={20}/> : <Info className="shrink-0 mt-0.5" size={20}/>}
      <div className="text-sm leading-relaxed"><p className="font-bold">{status}</p>
        {report.securityHold&&<p>Bu sınav güvenlik incelemesinde. Puanlar kesin sonuç olarak kullanılamaz; önce kurumun incelemesi tamamlanmalıdır.</p>}
        {!report.keyConfirmed&&<p>Bu denemenin cevap anahtarı doğrulanmamış. Kurum yöneticisi anahtarı kontrol edene kadar sonuç ön sonuçtur.</p>}
        {!held&&<p>Puanlar kaydedilen cevaplara göre hesaplandı. Kur önerisi geçicidir; toplam puan ve düzey kümeleri bir öğretmen tarafından birlikte değerlendirilmelidir.</p>}
      </div>
    </div>

    <nav aria-label="Rapor bölümleri" className="flex flex-wrap gap-2 print:hidden text-xs font-semibold">
      {[['ozgun-overview','Genel bakış'],['ozgun-skills','Beceri profili'],['ozgun-clusters','Düzey kümeleri'],['ozgun-next','Sonraki adımlar']].map(([id,label])=><a key={id} href={`#${id}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-indigo-500">{label}</a>)}
    </nav>

    <section id="ozgun-overview" aria-labelledby="ozgun-overview-title" className="scroll-mt-6 grid gap-4 lg:grid-cols-[1.05fr_1.3fr]">
      <div className="report-card report-hero rounded-2xl bg-slate-900 p-6 sm:p-8 text-white">
        <h2 id="ozgun-overview-title" className="text-sm font-semibold text-slate-300">Toplam doğru</h2>
        <p className="my-4 text-5xl sm:text-6xl font-black tracking-tight">{report.correct} / {report.total}</p>
        <p className="text-sm text-slate-300">{report.wrong} yanlış · {report.blank} boş · %{report.percent}</p>
        <div role="img" aria-label={`${report.correct} doğru, ${report.wrong} yanlış, ${report.blank} boş`} className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-700">
          <span className="bg-emerald-400" style={{width:`${report.correct/report.total*100}%`}}/>
          <span className="bg-rose-400" style={{width:`${report.wrong/report.total*100}%`}}/>
          <span className="bg-slate-500" style={{width:`${report.blank/report.total*100}%`}}/>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-slate-300"><span><span className="text-emerald-400" aria-hidden="true">●</span> Doğru</span><span><span className="text-rose-400" aria-hidden="true">●</span> Yanlış</span><span><span className="text-slate-500" aria-hidden="true">●</span> Boş</span></div>
        <p className="mt-6 text-sm text-slate-300">{insight.answered} / {report.total} soru cevaplandı · %{insight.completionPercent} katılım</p>
        <p className="mt-2 text-xs text-slate-400">Her doğru 1 puan. Yanlış ve boş cevap 0 puandır; yanlışlar doğruları götürmez.</p>
      </div>
      {placement&&<section aria-labelledby="ozgun-course-suggestion" className={`${card} p-6 sm:p-8 flex flex-col justify-between`}>
        <div>
          <div className="flex items-center gap-2 text-indigo-600"><Target size={18}/><h2 id="ozgun-course-suggestion" className="text-sm font-bold">Geçici kur önerisi</h2></div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight mt-4 text-indigo-700">{placement.recommendation.label}</p>
          <p className="text-sm text-slate-500 mt-2">Toplam puan aralığı: {placement.recommendation.min}–{placement.recommendation.max} / 96</p>
          <p className="text-sm text-slate-600 leading-relaxed mt-4">{held ? 'Önce raporun inceleme koşullarını tamamlayın. Bu öneriyi henüz bir yerleştirme kararı olarak kullanmayın.' : 'Kur adaylığı, hedeflenen eğitime başlamanın değerlendirilmesidir; o düzeyin yeterliğini tamamlamak anlamına gelmez.'}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 p-4 mt-5 text-sm text-indigo-950">
          <p className="font-bold">Bu öneri nasıl okunmalı?</p>
          <p className="mt-1">Aralıklar ilk uygulama kurallarıdır; pilot verisiyle doğrulanmış CEFR sınırları değildir. Toplam puan tek başına yerleştirme kararı değildir. Otomatik yerleştirme yapılmaz.</p>
        </div>
      </section>}
    </section>

    {insight.noAnswers&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Hiçbir soru cevaplanmadı. 0 puan, öğrencinin İngilizce düzeyi hakkında yeterli kanıt sağlamaz. Kur kararı vermeden önce yönerge takibini ve temel anlamayı bireysel bir görevle kontrol edin.</p>}

    <section id="ozgun-skills" aria-labelledby="ozgun-skills-title" className="scroll-mt-6 space-y-4">
      <div><h2 id="ozgun-skills-title" className="text-xl font-bold">Beceri profili</h2><p className="text-sm text-slate-500 mt-1">Dört bölümün ham puanları. Bu puanlardan kesin bir beceri seviyesi çıkarılmaz.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{report.sections.map(section=>{
        const guide=OZGUN_SKILL_GUIDANCE[section.skill];
        return <article aria-label={`${section.label} bölüm sonucu`} key={section.skill} className={`${card} p-5`}>
          <div className="flex items-center gap-2" style={{color:guide?.color}}>{icons[section.skill]}<h3 className="font-bold">{guide?.title ?? section.label}</h3></div>
          <p className="text-xs text-slate-400 mt-1">{section.label} · Sorular {section.first}–{section.last}</p>
          <p className="font-black text-3xl mt-5">{section.correct}<span className="text-base font-medium text-slate-400"> / {section.total}</span></p>
          <div className="h-2 rounded-full bg-slate-100 mt-3 overflow-hidden" aria-hidden="true"><div className="h-full rounded-full" style={{backgroundColor:guide?.color,width:`${section.percent}%`}}/></div>
          <p className="text-xs text-slate-500 mt-3">{section.wrong} yanlış · {section.blank} boş · %{section.percent} doğru</p>
          <p className="text-xs leading-relaxed text-slate-500 mt-4">{guide?.description}</p>
        </article>;
      })}</div>
      <div className={`${card} p-5 grid gap-5 sm:grid-cols-2`}>
        <div><p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Gözlenen puan dağılımı</p><p className="text-sm leading-relaxed mt-2">{insight.noAnswers ? 'Cevap olmadığı için bölümler arasında anlamlı bir karşılaştırma yapılamaz.' : insight.tied ? 'Dört bölümün doğru sayısı eşit. Bu, dört becerinin aynı düzeyde olduğu anlamına gelmez.' : <>En çok doğru cevap: <strong>{names(insight.highest)}</strong>. Daha az doğru cevap: <strong>{names(insight.focus)}</strong>.</>}</p></div>
        <div><p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Yorumlama notu</p><p className="text-sm leading-relaxed mt-2">{insight.gap>=6 ? `Bölümler arasında ${insight.gap} puan fark var. Düşük puanlı alanı ek görevle inceleyin.` : 'Bölüm farkları ve boş cevaplar, kısa ek görevlerle birlikte değerlendirilmelidir.'} Boş sorular, bilginin yanında süre veya yönerge takibiyle de ilişkili olabilir.</p></div>
      </div>
    </section>

    {placement&&<section id="ozgun-clusters" aria-labelledby="ozgun-cluster-evidence" className="scroll-mt-6 space-y-4">
      <div><h2 id="ozgun-cluster-evidence" className="text-xl font-bold">Hedef düzey kümeleri</h2><p className="text-sm text-slate-500 mt-1">Her küme dört bölümden dörder soru içerir: toplam 16 soru. Renkler kanıt dağılımını gösterir; öğrencinin kesin CEFR seviyesi değildir.</p></div>
      <div className="flex items-start gap-3 rounded-xl bg-slate-100 p-4 text-sm text-slate-600"><Layers3 size={20} className="shrink-0"/><p>Güçlü kanıt için en az <strong>12/16</strong> ve her bölümde en az <strong>2/4</strong> gerekir. Küçük kümelerde tek soruluk fark yorumu belirgin değiştirebilir.</p></div>
      <div className="cluster-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">{placement.clusters.map(cluster=>{
        const state=STATUS[cluster.status];
        return <article key={cluster.level} aria-label={`${cluster.level} kümesi`} className={`${card} p-5`}>
          <div className="flex items-center justify-between gap-2"><h3 className="text-xl font-black">{cluster.level}<span className="sr-only"> hedefli soru kümesi</span></h3><p className="font-bold text-lg">{cluster.correct}<span className="text-sm text-slate-400"> / 16</span></p></div>
          <p className={`inline-block text-xs font-bold border rounded-full px-3 py-1 mt-3 ${state.className}`}>{state.title}</p>
          <dl className="grid grid-cols-2 gap-2 mt-4">{cluster.skills.map(skill=><div key={skill.skill} className="rounded-lg bg-slate-50 p-2.5"><dt className="text-xs text-slate-500">{OZGUN_SKILL_GUIDANCE[skill.skill]?.title ?? skill.label}</dt><dd className="font-bold text-sm mt-1">{skill.correct}/4 <span className="text-[10px] font-normal text-slate-400">· Soru {skill.first}–{skill.last}</span></dd></div>)}</dl>
          <p className="text-xs text-slate-500 leading-relaxed mt-4">{state.description}</p>
        </article>;
      })}</div>
      <p className="text-sm text-slate-600">{insight.strongClusters.length ? <>Güçlü, bölümlere yayılmış kanıt görülen kümeler: <strong>{insight.strongClusters.map(cluster=>cluster.level).join(', ')}</strong>.</> : 'Henüz güçlü ve dört bölüme yayılmış kanıt gösteren bir küme yok. Bu durum “A1 altı” sonucu olarak yorumlanmamalıdır.'}</p>
    </section>}

    <section id="ozgun-next" aria-labelledby="ozgun-review-checks" className="scroll-mt-6 grid gap-4 lg:grid-cols-2">
      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex items-center gap-2 text-indigo-600"><ClipboardCheck size={20}/><h2 id="ozgun-review-checks" className="text-lg font-bold">Kur kararından önce</h2></div>
        <p className="mt-2 mb-5 text-sm text-slate-500">Öğretmen veya kurum için bu sonuca bağlı kontrol listesi.</p>
        {insight.beforePlacement.length ? <ul className="space-y-4">{insight.beforePlacement.map(check=><li key={check.code} className="flex items-start gap-3"><span className="w-5 h-5 mt-0.5 rounded border border-slate-300 shrink-0" aria-hidden="true"/><div><h3 className="text-sm font-bold">{CHECK_TITLES[check.code] ?? 'Ek değerlendirme'}</h3><p className="text-sm text-slate-600 leading-relaxed mt-1">{check.message}</p></div></li>)}</ul> : <p className="text-sm leading-relaxed text-slate-600">Bu kurallara göre ek bir eşik, küme uyuşmazlığı veya bölüm farkı uyarısı oluşmadı. Yine de öneriyi kısa bireysel görevler ve öğretmen görüşüyle değerlendirin; otomatik yerleştirme yapılmaz.</p>}
        {report.securityHold&&<p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Güvenlik incelemesi tamamlanmadan kur kararı vermeyin.</p>}
        <div className="flex gap-2 border-t border-slate-100 pt-4 mt-5 text-sm text-slate-600"><Clock3 size={18} className="shrink-0 text-indigo-500"/><p><strong>İlk iki hafta:</strong> Ders içi performansa göre kur uygunluğunu yeniden değerlendirin.</p></div>
      </div>
      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex items-center gap-2 text-indigo-600"><ArrowUpRight size={20}/><h2 className="text-lg font-bold">Öğrenci için çalışma önerileri</h2></div>
        <p className="text-sm text-slate-500 mt-2 mb-5">{insight.focus.length ? `Öncelikli inceleme alanı: ${names(insight.focus)}. ` : 'Dört alanı birlikte geliştirin. '}Bunlar alıştırma önerileridir; yanlışların nedenine ilişkin tanı değildir.</p>
        <ul className="space-y-4">{insight.practice.map(section=><li key={section.skill}><h3 className="font-bold text-sm">{OZGUN_SKILL_GUIDANCE[section.skill]?.title ?? section.label}</h3><p className="text-sm text-slate-600 leading-relaxed mt-1">{OZGUN_SKILL_GUIDANCE[section.skill]?.practice}</p></li>)}</ul>
        <div className="mt-5 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950"><p className="font-bold">Bir sonraki görüşmede</p><p className="mt-1">Bu raporu öğretmeninize gösterin. Zorlandığınız soruları, boş bırakma nedenlerinizi ve rahat hissettiğiniz görevleri birlikte konuşun.</p></div>
      </div>
    </section>

    {placement&&<section className={`${card} p-5 sm:p-6`} aria-labelledby="ozgun-score-bands">
      <h2 id="ozgun-score-bands" className="font-bold">Puan aralıkları nasıl kullanılır?</h2><p className="text-sm text-slate-500 mt-1 mb-4">Geçici ilk kur önerileri. Mevcut toplam puanın bulunduğu aralık işaretlidir.</p>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{OZGUN_COURSE_BANDS.map(band=><li key={band.target} aria-current={band.target===placement.recommendation.target ? 'true' : undefined} className={`rounded-xl border p-3 text-sm ${band.target===placement.recommendation.target ? 'border-indigo-300 bg-indigo-50 text-indigo-950' : 'border-slate-100 text-slate-600'}`}><div className="flex items-center gap-2 font-bold">{band.min}–{band.max} / 96{band.target===placement.recommendation.target&&<CheckCircle2 size={15} aria-label="Mevcut puan aralığı"/>}</div><p className="mt-1">{band.label}</p></li>)}</ol>
    </section>}

    <footer className="report-footer border-t border-slate-200 pt-5 text-xs text-slate-500 leading-relaxed">
      <p className="font-bold text-slate-600">Bu raporun kapsamı</p><p className="mt-1">Writing ve Speaking bu sınavda ölçülmedi. Kur önerileri pilot verisiyle doğrulanmış CEFR sınırları değildir. Kesin genel CEFR seviyesi veya yeterlilik sertifikası üretilmez. Küme ve bölüm puanları, ek değerlendirme için yol gösterir.</p>
    </footer>
  </main>;
}
