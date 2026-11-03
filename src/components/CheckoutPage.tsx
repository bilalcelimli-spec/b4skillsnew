import React from 'react';
import { SiteNav } from './SiteNav';
import { SiteFooter } from './SiteFooter';
import type { PurchasePlanId } from '../lib/payments/purchase-policy';

/** No payment provider is active. Do not offer a checkout or collect purchase consents. */
export function CheckoutPage(_props: { initialPlan?: PurchasePlanId }) {
  return <div className="min-h-screen bg-slate-50"><SiteNav onStart={() => { window.location.href = '/pricing'; }} />
    <main lang="tr" className="max-w-2xl mx-auto px-6 pt-32 pb-20 space-y-6">
      <h1 className="text-3xl font-bold">Satın alma bilgisi</h1>
      <p className="rounded-2xl border bg-white p-6 leading-7">Bu sitede ücretli bireysel satın alma şu anda sunulmuyor. Kart bilgisi veya ödeme onayı alınmaz. Apple uygulama içi satın alma da henüz etkin değildir.</p>
      <p>Ücretsiz seviye testini kullanabilir veya kurumunuzun verdiği sınav koduyla değerlendirmenize erişebilirsiniz.</p>
      <a className="inline-block rounded-xl bg-indigo-600 text-white px-6 py-3 font-semibold" href="/pricing">Ücretsiz seviye testine git</a>
      <p className="text-sm space-x-4"><a href="/refund-policy" className="underline">İade ve cayma politikası</a><a href="/support" className="underline">Destek</a></p>
    </main><SiteFooter /></div>;
}
