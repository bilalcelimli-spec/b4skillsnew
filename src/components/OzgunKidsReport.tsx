import React from 'react';
import {Button} from './ui/Button';
export function OzgunKidsReport({report,candidateName,completedAt,onClose}:{report:any;candidateName?:string;completedAt?:string;onClose?:()=>void}) {
  return <main className="ozgun-kids-report mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
    <style>{`@media print {
      .ozgun-kids-report { max-width: none; padding: 0; }
      .ozgun-kids-report .overflow-x-auto { overflow: visible; }
      .ozgun-kids-report table { table-layout: fixed; font-size: 9pt; width: 100%; }
      .ozgun-kids-report th, .ozgun-kids-report td { min-width: 0; padding: 4px; white-space: normal; overflow-wrap: anywhere; }
    }`}</style>
    <div className="flex flex-wrap justify-between gap-3 items-start"><div><h1 className="text-2xl font-bold">Özgün Kids · Form A sonuçları</h1><p className="text-slate-500">{candidateName}{completedAt?` · ${new Date(completedAt).toLocaleDateString('tr-TR')}`:''}</p></div><div className="flex gap-2 print:hidden"><Button variant="outline" onClick={()=>window.print()}>Yazdır</Button>{onClose&&<Button variant="outline" onClick={onClose}>Geri dön</Button>}</div></div>
    {report.securityHold&&<p role="alert" className="rounded-xl bg-amber-50 p-4">Bu sınav güvenlik incelemesinde. Puanlar kesin sonuç olarak kullanılamaz.</p>}
    {!report.keyConfirmed&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4">Bu denemenin cevap anahtarı doğrulanmamış. Kurum yöneticisi anahtarı kontrol edene kadar sonuç ön sonuçtur.</p>}
    <section className="bg-indigo-600 text-white rounded-2xl p-6 print:bg-white print:text-black print:border"><p>Toplam doğru</p><p className="text-4xl font-bold my-2">{report.correct} / {report.total}</p><p>{report.wrong} yanlış · {report.blank} boş · %{report.percent}</p></section>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Bölüm','Doğru','Yanlış','Boş','Puan'].map(label=><th key={label} className="p-3 border-b">{label}</th>)}</tr></thead><tbody>{report.sections.map((section:any)=><tr key={section.skill}><th className="p-3 border-b">{section.label}</th><td className="p-3 border-b">{section.correct}</td><td className="p-3 border-b">{section.wrong}</td><td className="p-3 border-b">{section.blank}</td><td className="p-3 border-b">{section.correct}/24 (%{section.percent})</td></tr>)}</tbody></table></div>
    {report.placement&&<>
      <section aria-labelledby="ozgun-course-suggestion" className="rounded-2xl border bg-white p-5 space-y-3">
        <h2 id="ozgun-course-suggestion" className="text-lg font-bold">Geçici kur önerisi</h2>
        <p className="text-xl font-semibold text-indigo-700">{report.placement.recommendation.label}</p>
        <p className="text-sm">Bu aralıklar ilk uygulama kurallarıdır; pilot verisinden elde edilmiş veya doğrulanmış CEFR sınırları değildir. Kur adaylığı, hedeflenen eğitime başlamanın değerlendirilmesidir; o düzeyin yeterliğini tamamlamak anlamına gelmez. Toplam puan tek başına yerleştirme kararı değildir. Otomatik yerleştirme yapılmaz.</p>
      </section>
      <section aria-labelledby="ozgun-cluster-evidence" className="space-y-3">
        <h2 id="ozgun-cluster-evidence" className="text-lg font-bold">Hedef düzey kümeleri</h2>
        <p className="text-sm text-slate-600">Her küme, dört bölümden dörder soru içerir. Güçlü kanıt için en az 12/16 ve her bölümde en az 2/4 gerekir. Bu küçük kümeler kesin beceri seviyesi vermez; tek soruluk fark sonucu belirgin değiştirebilir. Dar ekranda tabloyu yana kaydırabilirsiniz.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Düzey kümelerinin soru aralıkları ve başarıları</caption><thead><tr>{['Hedef','Grammar','Vocabulary','Reading','Listening','Toplam','Geçici yorum'].map(label=><th className="p-3 border-b" key={label}>{label}</th>)}</tr></thead><tbody>{report.placement.clusters.map((cluster:any)=><tr key={cluster.level}>
          <th className="p-3 border-b">{cluster.level}</th>
          {cluster.skills.map((skill:any)=><td className="p-3 border-b whitespace-nowrap" key={skill.skill}><span>{skill.correct}/4</span><span className="block text-xs text-slate-500">Soru {skill.first}–{skill.last}</span></td>)}
          <td className="p-3 border-b font-semibold">{cluster.correct}/16</td><td className="p-3 border-b min-w-48">{cluster.label}</td>
        </tr>)}</tbody></table></div>
      </section>
      <section aria-labelledby="ozgun-review-checks" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
        <h2 id="ozgun-review-checks" className="text-lg font-bold">Karardan önce ve yerleştirme sonrası kontroller</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm">{report.placement.checks.map((check:any)=><li key={check.code}>{check.message}</li>)}</ul>
      </section>
    </>}
    <p className="text-sm text-slate-600">Her doğru cevap 1 puan; yanlış ve boş cevap 0 puandır. Writing ve Speaking bu sınavda ölçülmedi. Kur önerileri pilot verisiyle doğrulanmış CEFR sınırları değildir. Kesin genel CEFR seviyesi veya yeterlilik sertifikası üretilmez.</p>
  </main>;
}
