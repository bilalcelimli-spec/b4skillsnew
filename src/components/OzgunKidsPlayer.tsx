import React, {useEffect,useRef,useState} from 'react';
import {OZGUN_TITLE,OZGUN_MEDIA,OZGUN_SECTIONS,type FixedAnswers} from '../lib/fixed-forms/ozgun-kids';
import {ExitAssessmentControl} from './ExitAssessmentControl';
import { MultipleChoiceOptions } from './MultipleChoiceOptions';
import {Button} from './ui/Button';
import { AssessmentHeader, AssessmentSections, AssessmentFooter, SECTION_COLORS } from './AssessmentChrome';
import { FaceCapture } from './FaceCapture';
import { PracticeMode } from './PracticeMode';
import { ProctoringMonitor } from './ProctoringMonitor';
import { proctoringEventPayload } from '../lib/proctoring/event-protocol';
import { Activity, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props={organizationId:string;initialSessionId?:string;onSessionStarted?:(id:string)=>void;onComplete:(theta:null,id:string)=>void;onCancel?:()=>void};
export function OzgunKidsPlayer(props:Props) {
  const { t } = useTranslation();
  const [photoReady, setPhotoReady] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [transition, setTransition] = useState<{completed: string; next: string} | null>(null);
  const [data,setData]=useState<any>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const [answers,setAnswers]=useState<FixedAnswers>({}),[number,setNumber]=useState(1),[pending,setPending]=useState(0);
  const [saveErrors,setSaveErrors]=useState<Record<string,any>>({}),[clock,setClock]=useState(Date.now());
  const [playing,setPlaying]=useState(false),[audioError,setAudioError]=useState(false);
  const init=useRef<Promise<any>|null>(null),notified=useRef(false),completed=useRef(false),alive=useRef(true);
  const queue=useRef(Promise.resolve()),pendingRef=useRef(0),currentSection=useRef(-1),audio=useRef<HTMLAudioElement>(null);
  const offset=useRef(0),failed=useRef<Record<string,any>>({});
  const edits=useRef<Record<string,number>>({});
  const lastServerTime=useRef(0), actionPending=useRef(false);
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
      if (currentSection.current >= 0 && result.section && result.status === 'IN_PROGRESS') {
        setTransition({completed: OZGUN_SECTIONS[currentSection.current]?.label ?? '', next: result.section.label});
      }
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
    if (actionPending.current) return null;
    actionPending.current = true;
    setBusy(true);setError(null);
    try {const result=await request(`${base}/${name}`,body);apply(result);return result;}catch(e){setError((e as Error).message);return null;}finally{actionPending.current=false;setBusy(false);}
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
  useEffect(() => {
    if (!transition) return;
    const timer = setTimeout(() => setTransition(null), 1500);
    return () => clearTimeout(timer);
  }, [transition]);
  const counts = Object.fromEntries(OZGUN_SECTIONS.map(section => [section.skill,
    Array.from({length: 24}, (_, index) => section.first + index).filter(n => answers[String(n)]).length]));
  const exitControl = props.onCancel && <ExitAssessmentControl floating={data?.status === 'SCHEDULED'} disabled={pending>0||busy} onExit={()=>{alive.current=false;props.onCancel?.();}}/>;
  const advance = () => {
    if (window.confirm(data.sectionIndex===3?'Sınavı bitirmek istiyor musunuz? Boş sorular 0 puan alır.':'Bu bölümü bitirmek istiyor musunuz? Bu bölüme dönemezsiniz.')) void action('advance',{sectionIndex:data.sectionIndex});
  };
  const question=data?.questions?.find((q:any)=>q.number===number);
  if (data?.status === 'SCHEDULED') return <>
    {exitControl}
    {error && <div role="alert" className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">{error}</div>}
    {!photoReady ? <FaceCapture sessionId={data.sessionId} onCaptureDone={() => setPhotoReady(true)} />
      : <PracticeMode multipleChoiceOnly onComplete={() => {if(!busy) void action('start');}} onSkip={() => {if(!busy) void action('start');}} />}
  </>;
  return <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
    {data?.status === 'IN_PROGRESS' && <ProctoringMonitor sessionId={data.sessionId} onEvent={async (type, severity, metadata) => {
      try {await request('/api/proctoring/event', proctoringEventPayload(data.sessionId, type, severity, metadata));}
      catch {console.error('Failed to log proctoring event');}
    }} />}
    <AssessmentHeader>
      <Button variant="ghost" size="sm" className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold text-xs" aria-expanded={showInsights} aria-controls="assessment-insights" onClick={() => setShowInsights(!showInsights)}><Activity size={16}/>{t('admin.analytics')}</Button>
      {exitControl}
      {remaining!==null&&<span role="timer" aria-label="Section time remaining" className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl font-mono text-sm sm:text-base font-bold ${remaining <= 60 ? 'bg-red-100 text-red-700' : remaining <= 300 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}><Clock size={16}/>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</span>}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider"><ShieldCheck size={14}/>Secure Session</div>
    </AssessmentHeader>
    <AssessmentSections order={OZGUN_SECTIONS.map(section => section.skill)} index={data?.sectionIndex ?? 0} counts={counts}/>
    <main className="flex-1 flex flex-col items-center p-3 sm:p-6 md:p-12 overflow-y-auto">
      <div className="w-full max-w-3xl space-y-5">
      {showInsights && <section id="assessment-insights" className="bg-indigo-50 border border-indigo-100 rounded-[32px] p-6 shadow-sm">
        <h2 className="text-sm font-bold text-indigo-700 mb-3">{t('exam.insightsTitle', {defaultValue:'Exam progress'})}</h2>
        <p className="text-sm text-slate-700 mb-2">{Object.values(answers).filter(Boolean).length} / 96 cevap</p>
        <p className="text-xs text-slate-500 mb-4">Sonuçlar sınav tamamlandıktan sonra gösterilir. Writing ve Speaking bu sınavda ölçülmez.</p>
        <div className="grid grid-cols-2 gap-3">{OZGUN_SECTIONS.map(section => <div key={section.skill} className="bg-white p-3 rounded-xl border border-indigo-100"><h3 className="text-xs font-bold text-slate-700">{section.label}</h3><p className="text-sm text-indigo-700 mt-1">{counts[section.skill]} / 24</p></div>)}</div>
      </section>}
      {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error} <Button variant="outline" size="sm" onClick={()=>{if(Object.keys(saveErrors).length)Object.entries(saveErrors).forEach(([n,answer])=>save(Number(n),answer));else if(!data){init.current=null;window.location.reload();}else void refresh();}}>Tekrar dene</Button></div>}
      {!data&&!error&&<p role="status">Sınav hazırlanıyor…</p>}
      {data?.status==='IN_PROGRESS'&&data.section&&(transition ? <section className="flex flex-col items-center justify-center py-24 text-center">
        <CheckCircle2 size={64} className="text-indigo-600 mb-6"/><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Section {data.sectionIndex} of 4 Complete</p>
        <h2 className="text-3xl font-black text-slate-900 mt-2 mb-3">{transition.completed} Complete</h2><p className="text-slate-500 mb-6">Next up: <strong>{transition.next}</strong></p>
        <Button variant="ghost" onClick={() => setTransition(null)}>Continue manually →</Button>
      </section> : <>
        <p role="status" className="text-sm text-slate-600">{pending?'Cevap kaydediliyor…':Object.keys(saveErrors).length?'Cevap kaydedilemedi. Tekrar deneyin.':'Gönderilen cevaplar kaydedildi.'} · {Object.values(answers).filter(Boolean).length}/96 cevap</p>
        {data.sectionIndex===3&&<section className="bg-white border rounded-xl p-4 space-y-3">
          <h2 className="font-bold">Listening · Toplu sınav kaydı</h2>
          <p className="text-sm">Her konuşma bu kayıtta iki kez bulunur. İnceleme ve cevaplama araları kayda dahildir. Kayıt tekrar başlatılmaz; bağlantı kesilirse geçen süreye göre devam eder.</p>
          <audio ref={audio} preload="metadata" src={`${OZGUN_MEDIA}/Listening_Tam_Sinav.mp3`} onError={()=>setAudioError(true)} onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)}/>
          <Button disabled={busy||playing} onClick={listen}>{playing?'Dinleme sürüyor':data.listeningStartedAt?'Kayda devam et':'Dinleme kaydını başlat'}</Button>
          {audioError&&<p role="alert" className="text-red-700">Ses oynatılamadı veya kayıt sona erdi. Bağlantınızı ve ses çıkışını kontrol edin.</p>}
        </section>}

        {question&&<div className={`grid gap-5 ${question.passage?'lg:grid-cols-2':''}`}>
          {question.passage&&<article aria-label={`Okuma metni ${question.passageId}`} className="whitespace-pre-line bg-white p-5 rounded-2xl border leading-relaxed">{question.passage}</article>}
          <section className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-5 sm:p-8 space-y-5">
            <p className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest text-white ${SECTION_COLORS[data.section.skill]}`}>{data.section.label} · {question.recording?`Recording ${question.recording} · `:''}Soru {question.number}/96</p>
            <h2 id="item-prompt" className="font-bold text-lg sm:text-xl">{question.prompt}</h2>
            <MultipleChoiceOptions options={Object.values(question.options).map(String)}
              selected={answers[String(number)] ? Object.keys(question.options).indexOf(answers[String(number)]!) : null}
              onSelect={index => save(number, Object.keys(question.options)[index])} disabled={busy || remaining === 0}/>

            <Button variant="ghost" size="sm" onClick={()=>save(number,null)}>Cevabı temizle</Button>
            <div className="flex justify-between gap-3"><Button variant="outline" disabled={number===data.section.first} onClick={()=>setNumber(number-1)}>Önceki</Button><Button disabled={pending>0||busy||Object.keys(saveErrors).length>0} onClick={()=>number===data.section.last ? advance() : setNumber(number+1)}>{number===data.section.last ? (data.sectionIndex===3 ? "Sınavı bitir" : "Bölümü bitir ve devam et") : "Sonraki"}</Button></div>
          </section>
        </div>}
        <nav aria-label="Bölüm soruları" className="grid grid-cols-6 sm:grid-cols-12 gap-2">{data.questions.map((q:any)=><button key={q.number} aria-label={`Soru ${q.number}`} aria-current={q.number===number?'step':undefined} onClick={()=>setNumber(q.number)} className={`rounded-lg border py-2 text-sm ${q.number===number?'bg-indigo-600 text-white':answers[String(q.number)]?'bg-emerald-100 border-emerald-300':'bg-white'}`}>{q.number}</button>)}</nav>
        {number!==data.section.last&&<Button variant="secondary" disabled={pending>0||busy||Object.keys(saveErrors).length>0} onClick={advance}>{data.sectionIndex===3?'Sınavı bitir':'Bölümü bitir ve devam et'}</Button>}
      </>)}
      {data?.report&&<p>Sonuçlar açılıyor…</p>}
      </div>
    </main>
    <AssessmentFooter sessionId={data?.sessionId} connection={pending ? "Cevap kaydediliyor…" : Object.keys(saveErrors).length ? "Cevap kaydedilemedi" : "Gönderilen cevaplar kaydedildi."} detail={OZGUN_TITLE}/>
  </div>;
}
