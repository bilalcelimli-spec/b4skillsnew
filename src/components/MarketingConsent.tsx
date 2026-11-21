import React, { createContext, useEffect, useState } from 'react';
import { analyticsChoice, disableMarketingMeasurement, isPublicMarketingPath, measureMarketingPage, setAnalyticsChoice } from '../services/marketingMeasurement';

export const MeasurementPrivacyContext = createContext<(active: boolean) => void>(() => {});
/** The consent control for the current marketing page. SiteFooter renders it in
 *  its bottom row so the footer ends the same way on every public page. */
export const FooterConsentContext = createContext<React.ReactNode>(null);

export function MarketingConsent({ path, isTr, enabled }: { path: string; isTr: boolean; enabled: boolean }) {
  const [choice, setChoice] = useState(analyticsChoice);
  const [open, setOpen] = useState(false);
  // The server cannot read the stored choice, so it renders no control. Show it
  // only after mount, so the first browser render matches the server HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (enabled) measureMarketingPage(path); else disableMarketingMeasurement();
    return disableMarketingMeasurement;
  }, [path, choice, enabled]);
  if (!mounted || !enabled || !isPublicMarketingPath(path)) return null;
  const select = (value: 'accepted' | 'rejected') => { setAnalyticsChoice(value); setChoice(analyticsChoice()); setOpen(false); };
  return <>
    <button type="button" className="underline underline-offset-2" onClick={() => setOpen(true)}>{isTr ? 'Çerez tercihleri' : 'Cookie preferences'}</button>
    {(choice === null || open) && <section aria-label={isTr ? 'Çerez tercihleri' : 'Cookie preferences'} className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-2xl rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 shadow-xl max-h-[75vh] overflow-auto">
      <h2 className="text-lg font-bold">{isTr ? 'İsteğe bağlı analiz' : 'Optional analytics'}</h2>
      <p className="my-3 text-sm leading-relaxed">{isTr ? 'İzin verirseniz Google Analytics herkese açık tanıtım sayfalarının ziyaretlerini ölçer. Hesap, sınav ve sonuç ekranları ile form bilgileri dahil değildir. Reklam depolaması ve kişiselleştirme kapalıdır. Tercihinizi buradan değiştirebilirsiniz.' : 'With your permission, Google Analytics measures visits to public information pages. Account, assessment and result screens and form details are excluded. Advertising storage and personalization remain off. You can change your choice here.'}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="rounded-lg border border-slate-500 bg-white px-4 py-2 text-sm" onClick={() => select('rejected')}>{isTr ? 'Yalnızca gerekli' : 'Necessary only'}</button>
        <button type="button" className="rounded-lg border border-slate-500 bg-white px-4 py-2 text-sm" onClick={() => select('accepted')}>{isTr ? 'Analize izin ver' : 'Allow analytics'}</button>
        <a href={'/privacy'} className="text-sm underline">{isTr ? 'Gizlilik' : 'Privacy'}</a>
      </div>
    </section>}
  </>;
}
