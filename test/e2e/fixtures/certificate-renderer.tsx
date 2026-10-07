import React from 'react';
import {createRoot} from 'react-dom/client';
import {CertificateView} from '../../../src/components/CertificateView';
import {AppToastProvider} from '../../../src/hooks/useToast';
import '../../../src/index.css';
const certificate={id:'certificate-fixture',sessionId:'session-fixture',candidateId:'candidate-fixture',candidateName:'Çağrı Çelimli Şen',organizationId:'org-fixture',organizationName:'Fixture Organization',cefrLevel:'B2',theta:.8,overallScore:60,
 skillScores:{reading:0,listening:55,writing:62,speaking:null,grammar:48,vocabulary:67},issuedAt:new Date('2026-10-07T00:00:00Z'),expiresAt:new Date('2028-10-01T00:00:00Z'),verificationUrl:'/verify/certificate-fixture',qrCodeUrl:''};
createRoot(document.getElementById('root')!).render(<AppToastProvider><CertificateView certificate={certificate}/></AppToastProvider>);
