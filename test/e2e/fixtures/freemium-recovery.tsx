import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FreemiumTestWidget} from '../../../src/components/FreemiumTestWidget';
import '../../../src/index.css';
function Fixture(){const [closed,setClosed]=useState(false);return closed?<h1>Quick check closed</h1>:<FreemiumTestWidget onClose={()=>setClosed(true)} onSignup={()=>{}}/>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
