import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CodeEntryPage} from '../../../src/components/CodeEntryPage';
import '../../../src/index.css';
function Fixture(){
 const [done,setDone]=useState(false);
 return done ? <h1>Preparation</h1> : <CodeEntryPage onBack={()=>{}} onSuccess={()=>setDone(true)}/>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
