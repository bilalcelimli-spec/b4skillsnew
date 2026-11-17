import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { ReportDocument } from '../../../lib/reporting/report-document';
import type { ReportLocale } from '../../../lib/reporting/report-copy';
import './report-print.css';

/** JSON transport turns Dates into strings; accept both. */
export type Wire<T> = T extends Date ? Date | string : T extends Array<infer U> ? Array<Wire<U>> : T extends object ? { [K in keyof T]: Wire<T[K]> } : T;
export type ReportDocumentData = Wire<ReportDocument>;

export const LOGO_SRC = '/brand/b4skills-logo-badge.png';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

/** Loads the brochure typeface once; falls back to Noto Sans offline. */
export function useBrandFont() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);
}

export function useQr(url: string | null | undefined) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!url) { setSrc(''); return; }
    let live = true;
    QRCode.toDataURL(url, { width: 320, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#2b0a20', light: '#ffffff' } })
      .then(v => { if (live) setSrc(v); }).catch(() => { if (live) setSrc(''); });
    return () => { live = false; };
  }, [url]);
  return src;
}

export function fmtDate(value: Date | string | null | undefined, locale: ReportLocale) {
  if (!value) return '—';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function Watermark({ text }: { text: string }) {
  return <div className="b4p-watermark" aria-hidden="true"><span>{text}</span></div>;
}
