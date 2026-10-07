import React, {useEffect,useRef,useState} from 'react';
import {OZGUN_MEDIA,OZGUN_SECTIONS,OZGUN_TITLE,type FixedAnswers} from '../lib/fixed-forms/ozgun-kids';
import {ExitAssessmentControl} from './ExitAssessmentControl';
import {Button} from './ui/Button';

type Props={organizationId:string;initialSessionId?:string;onSessionStarted?:(id:string)=>void;onComplete:(theta:null,id:string)=>void;onCancel?:()=>void};
export function OzgunKidsPlayer(props:Props) {
  const [data,setData]=useState<any>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const [answers,setAnswers]=useState<FixedAnswers>({}),[number,setNumber]=useState(1),[pending,setPending]=useState(0);
  const [saveErrors,setSaveErrors]=useState<Record<string,any>>({}),[clock,setClock]=useState(Date.now());
  const [playing,setPlaying]=useState(false),[audioError,setAudioError]=useState(false);
  const init=useRef<Promise<any>|null>(null),notified=useRef(false),completed=useRef(false),alive=useRef(true);
  const queue=useRef(Promise.resolve()),pendingRef=useRef(0),currentSection=useRef(-1),audio=useRef<HTMLAudioElement>(null);
  const offset=useRef(0),failed=useRef<Record<string,any>>({});
  const edits=useRef<Record<string,number>>({});
  const lastServerTime=useRef(0);
  async function request(url:string,body?:unknown) {
    const response=await fetch(url,{credentials:'include',...(body!==undefined?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error??'İşlem tamamlanamadı.');
    return result;
  }
  function apply(result:any) {
    const serverTime=new Date(result.serverNow).getTime();
    if(!alive.current || result.sectionIndex<currentSection.current || serverTime<lastServerTime.current)return;
    lastServerTime.current=serverTime;
    offset.current=serverTime-Date.now();
    if(result.sectionIndex!==currentSection.current) {
      currentSection.current=result.sectionIndex;setNumber(result.section?.first??1);setAnswers(result.answers??{});failed.current={};setSaveErrors({});
    } else if(pendingRef.current===0) setAnswers({...result.answers,...failed.current});
    setData(result);
  }
  useEffect(()=>{
    alive.current=true;
    if(!init.current) init.current=(async()=>{
      const launch=props.initialSessionId?{sessionId:props.initialSessionId}:await request('/api/fixed-forms/ozgun-kids/launch',{organizationId:props.organizationId});
      return request(`/api/sessions/${encodeURIComponent(launch.sessionId)}/fixed-form`);
    })();
    init.current.then(result=>{
      if(!alive.current)return;
      apply(result);
      if(!notified.current){notified.current=true;props.onSessionStarted?.(result.sessionId);}
    }).catch(e=>{if(alive.current)setError(e.message);});
    return()=>{alive.current=false;audio.current?.pause();};
  },[]);
  useEffect(()=>{
    if(!data?.report || completed.current)return;
    completed.current=true;props.onComplete(null,data.sessionId);
  },[data?.report]);
  useEffect(()=>{
    const tick=setInterval(()=>setClock(Date.now()),1000);
    return()=>clearInterval(tick);
  },[]);
  async function refresh() {
    if(!data?.sessionId)return;
    try {apply(await request(`/api/sessions/${encodeURIComponent(data.sessionId)}/fixed-form`));setError(null);}catch(e){setError((e as Error).message);}
  }
  useEffect(()=>{
    if(!data?.sessionId || data.report)return;
    const timer=setInterval(()=>void refresh(),10000);
    return()=>clearInterval(timer);
  },[data?.sessionId,!!data?.report]);
  const remaining=data?.sectionDeadline?Math.max(0,Math.ceil((new Date(data.sectionDeadline).getTime()-clock-offset.current)/1000)):null;
  useEffect(()=>{if(remaining===0)void refresh();},[remaining,data?.sectionIndex]);
  const base=data?`/api/sessions/${encodeURIComponent(data.sessionId)}/fixed-form`:'';
  async function action(name:string,body:unknown={}) {
    setBusy(true);setError(null);
    try {const result=await request(`${base}/${name}`,body);apply(result);return result;}catch(e){setError((e as Error).message);return null;}finally{setBusy(false);}
  }
  function save(n:number,answer:any) {
    const revision=(edits.current[String(n)]??0)+1;
    edits.current[String(n)]=revision;
    setAnswers(previous=>({...previous,[String(n)]:answer}));
    delete failed.current[String(n)];setSaveErrors({...failed.current});
    pendingRef.current++;setPending(pendingRef.current);
    queue.current=queue.current.then(async()=>{
      try {const result=await request(`${base}/answer`,{number:n,answer});if(edits.current[String(n)]===revision){delete failed.current[String(n)];setSaveErrors({...failed.current});}apply(result);}
      catch(e){const active=OZGUN_SECTIONS[currentSection.current];if(edits.current[String(n)]===revision&&active&&n>=active.first&&n<=active.last){failed.current[String(n)]=answer;setSaveErrors({...failed.current});setError((e as Error).message);}}
      finally{pendingRef.current--;if(alive.current){setPending(pendingRef.current);if(pendingRef.current===0&&Object.keys(failed.current).length===0)setError(null);}}
    });
  }
  async function listen() {
    const result=await action('listen');
    if(!result || !audio.current)return;
    const elapsed=Math.max(0,(Date.now()+offset.current-new Date(result.listeningStartedAt).getTime())/1000);
    if(Number.isFinite(audio.current.duration)&&elapsed>=audio.current.duration){setAudioError(true);return;}
    try {audio.current.currentTime=elapsed;await audio.current.play();setPlaying(true);setAudioError(false);}catch{setAudioError(true);}
  }
  const question=data?.questions?.find((q:any)=>q.number===number);
  return <div className="min-h-screen bg-slate-50 text-slate-900 pb-8">
    <header className="sticky top-0 z-10 bg-white border-b p-3 sm:px-6 flex flex-wrap justify-between items-center gap-3">
      <h1 className="font-bold">Özgün Kids · Form A</h1>
      <div className="flex flex-wrap gap-3 items-center">
        {remaining!==null&&<span role="timer" className="font-mono font-bold">{data.section.label} · {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</span>}
        {props.onCancel&&<ExitAssessmentControl disabled={pending>0||busy} onExit={()=>{alive.current=false;props.onCancel?.();}}/>}
      </div>
    </header>
    <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-5">
      {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error} <Button variant="outline" size="sm" onClick={()=>{if(Object.keys(saveErrors).length)Object.entries(saveErrors).forEach(([n,answer])=>save(Number(n),answer));else if(!data){init.current=null;window.location.reload();}else void refresh();}}>Tekrar dene</Button></div>}
      {!data&&!error&&<p role="status">Sınav hazırlanıyor…</p>}
      {data?.status==='SCHEDULED'&&<section className="bg-white rounded-2xl border p-5 space-y-4">
        <h2 className="text-xl font-bold">{OZGUN_TITLE}</h2>
        <p>96 soru · 105 dakika (3 dakika genel açıklama dahil). Her soruda A, B, C veya D seçeneklerinden birini seçin. Doğru cevap 1 puan; yanlış ve boş cevap 0 puan. Yanlışlar doğruları götürmez.</p>
        <ul className="list-disc pl-5">{OZGUN_SECTIONS.map(s=><li key={s.skill}>{s.label}: {s.first}–{s.last}. sorular · {s.minutes} dakika</li>)}</ul>
        <p>Bölüm süresi dolunca bir sonraki bölüm açılır. Bölümü erken bitirebilirsiniz; kapatılan bölüme dönülemez. Sözlük veya çeviri uygulaması kullanmayın. Writing ve Speaking bu sınavda ölçülmez.</p>
        <p>Dinlemede toplu kayıt bir kez oynatılır; her konuşma dosyanın içinde iki kez yer alır. Çıkış ve bağlantı kesilmesi süreyi durdurmaz.</p>
        <Button disabled={busy} onClick={()=>action('start')}>Sınavı başlat</Button>
      </section>}
      {data?.status==='IN_PROGRESS'&&data.section&&<>
        <nav aria-label="Sınav bölümleri" className="flex flex-wrap gap-2">{OZGUN_SECTIONS.map((s,i)=><span key={s.skill} aria-current={i===data.sectionIndex?'step':undefined} className={`rounded-full px-3 py-1 text-sm ${i===data.sectionIndex?'bg-indigo-600 text-white':'bg-slate-200'}`}>{s.label}</span>)}</nav>
        <p role="status" className="text-sm text-slate-600">{pending?'Cevap kaydediliyor…':Object.keys(saveErrors).length?'Cevap kaydedilemedi. Tekrar deneyin.':'Gönderilen cevaplar kaydedildi.'} · {Object.values(answers).filter(Boolean).length}/96 cevap</p>
        {data.sectionIndex===3&&<section className="bg-white border rounded-xl p-4 space-y-3">
          <h2 className="font-bold">Listening · Toplu sınav kaydı</h2>
          <p className="text-sm">Her konuşma bu kayıtta iki kez bulunur. İnceleme ve cevaplama araları kayda dahildir. Kayıt tekrar başlatılmaz; bağlantı kesilirse geçen süreye göre devam eder.</p>
          <audio ref={audio} preload="metadata" src={`${OZGUN_MEDIA}/Listening_Tam_Sinav.mp3`} onError={()=>setAudioError(true)} onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)}/>
          <Button disabled={busy||playing} onClick={listen}>{playing?'Dinleme sürüyor':data.listeningStartedAt?'Kayda devam et':'Dinleme kaydını başlat'}</Button>
          {audioError&&<p role="alert" className="text-red-700">Ses oynatılamadı veya kayıt sona erdi. Bağlantınızı ve ses çıkışını kontrol edin.</p>}
        </section>}
        <nav aria-label="Bölüm soruları" className="grid grid-cols-6 sm:grid-cols-12 gap-2">{data.questions.map((q:any)=><button key={q.number} aria-label={`Soru ${q.number}`} aria-current={q.number===number?'step':undefined} onClick={()=>setNumber(q.number)} className={`rounded-lg border py-2 text-sm ${q.number===number?'bg-indigo-600 text-white':answers[String(q.number)]?'bg-emerald-100 border-emerald-300':'bg-white'}`}>{q.number}</button>)}</nav>
        {question&&<div className={`grid gap-5 ${question.passage?'lg:grid-cols-2':''}`}>
          {question.passage&&<article aria-label={`Okuma metni ${question.passageId}`} className="whitespace-pre-line bg-white p-5 rounded-2xl border leading-relaxed">{question.passage}</article>}
          <section className="bg-white rounded-2xl border p-5 space-y-4">
            <p className="text-sm text-indigo-700">{question.recording?`Recording ${question.recording} · `:''}Soru {question.number}/96</p>
            <h2 className="font-bold text-lg">{question.prompt}</h2>
            <fieldset className="space-y-3"><legend className="sr-only">Soru {question.number} cevabı</legend>{Object.entries(question.options).map(([key,value])=><label key={key} className="flex gap-3 items-start border rounded-xl p-3 cursor-pointer">
              <input className="mt-1" type="radio" name={`question-${number}`} value={key} checked={answers[String(number)]===key} onChange={()=>save(number,key)}/><span>{key}) {String(value)}</span>
            </label>)}</fieldset>
            <Button variant="ghost" size="sm" onClick={()=>save(number,null)}>Cevabı temizle</Button>
            <div className="flex justify-between gap-3"><Button variant="outline" disabled={number===data.section.first} onClick={()=>setNumber(number-1)}>Önceki</Button><Button variant="outline" disabled={number===data.section.last} onClick={()=>setNumber(number+1)}>Sonraki</Button></div>
          </section>
        </div>}
        <Button variant="secondary" disabled={pending>0||busy||Object.keys(saveErrors).length>0} onClick={()=>{
          if(window.confirm(data.sectionIndex===3?'Sınavı bitirmek istiyor musunuz? Boş sorular 0 puan alır.':'Bu bölümü bitirmek istiyor musunuz? Bu bölüme dönemezsiniz.'))void action('advance',{sectionIndex:data.sectionIndex});
        }}>{data.sectionIndex===3?'Sınavı bitir':'Bölümü bitir ve devam et'}</Button>
      </>}
      {data?.report&&<p>Sonuçlar açılıyor…</p>}
      {data&&<p className="text-xs text-slate-500 break-all">Sınav kimliği: {data.sessionId}</p>}
    </main>
  </div>;
}
