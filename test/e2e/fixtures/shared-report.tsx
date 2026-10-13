import React from 'react';
import {createRoot} from 'react-dom/client';
import {SharedReportPage} from '../../../src/components/SharedReportPage';
import '../../../src/index.css';
createRoot(document.getElementById('root')!).render(<SharedReportPage token="0123456789abcdef0123456789abcdef"/>);
