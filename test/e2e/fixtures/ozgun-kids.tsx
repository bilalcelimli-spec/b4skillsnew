import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {OzgunKidsPlayer} from '../../../src/components/OzgunKidsPlayer';
import {OzgunKidsReport} from '../../../src/components/OzgunKidsReport';
import {ExamCodeManager} from '../../../src/components/admin/ExamCodeManager';
import {AppToastProvider} from '../../../src/hooks/useToast';
import {ToastProvider} from '../../../src/design-system/components';
import '../../../src/index.css';
function Fixture() {
  const [report,setReport]=useState<any>(null),[exited,setExited]=useState(false);
  const mode=new URLSearchParams(location.search).get('mode');
  if(mode==='admin')return <div className="p-4"><ExamCodeManager orgId="fixture-org"/></div>;
  if(exited)return <p>Dashboard</p>;
  if(report)return <OzgunKidsReport report={report} candidateName="Fixture candidate"/>;
  return <OzgunKidsPlayer organizationId="fixture-org" initialSessionId={mode==='resume'?'fixture-fixed':undefined} onCancel={()=>setExited(true)} onComplete={async(_,id)=>{
    const response=await fetch(`/api/sessions/${id}/fixed-form`);
    setReport((await response.json()).report);
  }}/>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ToastProvider><AppToastProvider><Fixture/></AppToastProvider></ToastProvider></React.StrictMode>);
