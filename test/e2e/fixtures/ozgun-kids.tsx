import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PreTestBriefing} from '../../../src/components/PreTestBriefing';
import {scoreFixedForm, type FixedAnswers} from '../../../src/lib/fixed-forms/ozgun-kids';
import {OZGUN_PRODUCT} from '../../../src/lib/fixed-forms/ozgun-kids';
import '../../../src/lib/i18n/config';
import {OzgunKidsPlayer} from '../../../src/components/OzgunKidsPlayer';
import {OzgunKidsReport} from '../../../src/components/OzgunKidsReport';
import {ExamCodeManager} from '../../../src/components/admin/ExamCodeManager';
import {AppToastProvider} from '../../../src/hooks/useToast';
import {ToastProvider} from '../../../src/design-system/components';
import '../../../src/index.css';
function Fixture() {
  const [ready,setReady]=useState(false);
  const [report,setReport]=useState<any>(null),[exited,setExited]=useState(false);
  const mode=new URLSearchParams(location.search).get('mode');
  if(exited)return <p>Dashboard</p>;
  if(mode==='report') {
    const scenario=new URLSearchParams(location.search).get('scenario')??'balanced';
    const counts=scenario==='balanced' ? [[4,4,4,4],[4,4,4,4],[4,4,4,4],[2,2,2,2],[1,1,1,1],[0,0,0,0]]
      : scenario==='advanced' ? Array.from({length:6},()=>[4,4,4,4]) : Array.from({length:6},()=>[0,0,0,0]);
    const answers:FixedAnswers={};
    counts.forEach((skills,level)=>skills.forEach((count,skill)=>{for(let offset=0;offset<count;offset++)answers[String(skill*24+level*4+offset+1)]='A';}));
    const result={...scoreFixedForm(answers,'A'.repeat(96),scenario!=='hold'),securityHold:scenario==='hold'};
    return <OzgunKidsReport report={result} candidateName="Ada Yılmaz" completedAt="2026-10-07T12:00:00Z" onClose={()=>setExited(true)}/>;
  }
  if(mode==='admin')return <div className="p-4"><ExamCodeManager orgId="fixture-org"/></div>;
  if(report)return <OzgunKidsReport report={report} candidateName="Fixture candidate"/>;
  if(!ready && mode!=='resume')return <PreTestBriefing productLine={OZGUN_PRODUCT} onStart={()=>setReady(true)} onCancel={()=>setExited(true)}/>;
  return <OzgunKidsPlayer organizationId="fixture-org" initialSessionId={mode==='resume'?'fixture-fixed':undefined} onCancel={()=>setExited(true)} onComplete={async(_,id)=>{
    const response=await fetch(`/api/sessions/${id}/fixed-form`);
    setReport((await response.json()).report);
  }}/>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ToastProvider><AppToastProvider><Fixture/></AppToastProvider></ToastProvider></React.StrictMode>);
