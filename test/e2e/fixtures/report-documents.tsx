/** Design/renderer fixture: ?sample=adult|junior|primary|provisional&kind=report|certificate&lang=en|tr */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { buildReportDocument, certificateAvailable } from '../../../src/lib/reporting/report-document';
import type { ReportLocale } from '../../../src/lib/reporting/report-copy';
import { PrintableDocuments, type PrintKind } from '../../../src/components/reports/print/PrintableReportPage';
import { SAMPLES } from '../../fixtures/report-document-samples';

const q = new URLSearchParams(location.search);
const sample = (q.get('sample') ?? 'adult') as keyof typeof SAMPLES;

function Fixture() {
  const [kind, setKind] = useState<PrintKind>(q.get('kind') === 'certificate' ? 'certificate' : 'report');
  const [locale, setLocale] = useState<ReportLocale>(q.get('lang') === 'tr' ? 'tr' : 'en');
  const doc = buildReportDocument(SAMPLES[sample] ?? SAMPLES.adult, {
    baseUrl: 'https://b4skills.com', locale, sample: q.get('watermark') !== '0', now: new Date('2026-11-13T09:00:00Z'),
  });
  return <PrintableDocuments doc={doc as any} kind={kind} certificateAvailable={certificateAvailable(doc)} onKind={setKind} onLocale={setLocale} />;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
