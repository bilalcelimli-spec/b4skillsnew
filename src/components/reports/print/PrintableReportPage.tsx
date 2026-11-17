import React, { useEffect, useState } from 'react';
import type { ReportLocale } from '../../../lib/reporting/report-copy';
import { CertificateDocument } from './CertificateDocument';
import { ScoreReportDocument } from './ScoreReportDocument';
import type { ReportDocumentData } from './shared';

export type PrintKind = 'report' | 'certificate';
type Payload = { document: ReportDocumentData; certificateAvailable: boolean };

/** Toolbar + A4 pages. Used by the in-app print route and the design fixture. */
export function PrintableDocuments({ doc, kind, certificateAvailable, onKind, onLocale, onBack }: {
  doc: ReportDocumentData; kind: PrintKind; certificateAvailable: boolean;
  onKind?: (k: PrintKind) => void; onLocale?: (l: ReportLocale) => void; onBack?: () => void;
}) {
  const L = doc.locale;
  const showCert = kind === 'certificate' && certificateAvailable;
  return (
    <div className="b4p">
      <nav className="b4p-toolbar" aria-label={L === 'tr' ? 'Belge araçları' : 'Document tools'}>
        {onBack && <button type="button" onClick={onBack}>{L === 'tr' ? '← Geri' : '← Back'}</button>}
        {onKind && <>
          <button type="button" aria-pressed={kind === 'report'} onClick={() => onKind('report')}>{L === 'tr' ? 'Sonuç raporu' : 'Score report'}</button>
          <button type="button" aria-pressed={kind === 'certificate'} disabled={!certificateAvailable} title={certificateAvailable ? undefined : (L === 'tr' ? 'Sertifika yalnızca kesinleşmiş, doğrulanmış sonuç için düzenlenir.' : 'A certificate is issued only for a final, verified result.')} onClick={() => onKind('certificate')}>{L === 'tr' ? 'Sertifika' : 'Certificate'}</button>
        </>}
        {onLocale && <>
          <button type="button" aria-pressed={L === 'tr'} onClick={() => onLocale('tr')}>TR</button>
          <button type="button" aria-pressed={L === 'en'} onClick={() => onLocale('en')}>EN</button>
        </>}
        <button type="button" className="primary" onClick={() => window.print()}>{L === 'tr' ? 'Yazdır / PDF' : 'Print / PDF'}</button>
      </nav>
      {showCert ? <CertificateDocument doc={doc} /> : <ScoreReportDocument doc={doc} />}
    </div>
  );
}

/** Logged-in route: /print/report/:sessionId and /print/certificate/:sessionId (?lang=tr|en). */
export function PrintableReportPage({ sessionId, initialKind, initialLocale, onBack }: {
  sessionId: string; initialKind: PrintKind; initialLocale: ReportLocale; onBack?: () => void;
}) {
  const [kind, setKind] = useState<PrintKind>(initialKind);
  const [locale, setLocale] = useState<ReportLocale>(initialLocale);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    fetch(`/api/sessions/${encodeURIComponent(sessionId)}/report-document?lang=${locale}`, { credentials: 'include' })
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        return body as Payload;
      })
      .then(body => { if (live) setData(body); })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [sessionId, locale]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.pathname = `/print/${kind}/${encodeURIComponent(sessionId)}`;
    url.searchParams.set('lang', locale);
    window.history.replaceState(null, '', url);
  }, [kind, locale, sessionId]);

  if (error) return <div role="alert" style={{ padding: 32, fontFamily: 'system-ui' }}>{locale === 'tr' ? 'Rapor yüklenemedi: ' : 'The report could not be loaded: '}{error}</div>;
  if (!data) return <div style={{ padding: 32, fontFamily: 'system-ui' }}>{locale === 'tr' ? 'Rapor hazırlanıyor…' : 'Preparing report…'}</div>;
  return <PrintableDocuments doc={data.document} kind={kind} certificateAvailable={data.certificateAvailable} onKind={setKind} onLocale={setLocale} onBack={onBack} />;
}
