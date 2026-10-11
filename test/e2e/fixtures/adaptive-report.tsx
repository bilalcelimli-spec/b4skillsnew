import React from 'react';
import { createRoot } from 'react-dom/client';
import { CandidateAdaptiveReport } from '../../../src/components/CandidateAdaptiveReport';
import { AppToastProvider } from '../../../src/hooks/useToast';
import '../../../src/index.css';
createRoot(document.getElementById('root')!).render(<AppToastProvider><main className="p-3"><CandidateAdaptiveReport sessionId="report-test" /></main></AppToastProvider>);
