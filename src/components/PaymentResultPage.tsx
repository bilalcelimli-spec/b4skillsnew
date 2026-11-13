import React, { useEffect, useState } from 'react';
import { SiteNav } from './SiteNav';
import { SiteFooter } from './SiteFooter';
export function PaymentResultPage({ orderId }: { orderId: string | null }) {
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!orderId) { setError('Sipariş kimliği bulunamadı.'); return; }
    const abort = new AbortController(); setError('');
    fetch(`/api/payments/orders/${encodeURIComponent(orderId)}`, { credentials: 'include', signal: abort.signal })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setOrder(data); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [orderId, revision]);
  const paid = order?.status === 'COMPLETED';
  return <div className="min-h-screen bg-slate-50"><SiteNav onStart={() => { window.location.href = '/dashboard'; }} /><main lang="tr" className="max-w-2xl mx-auto px-6 pt-32 pb-20 space-y-6">
    <h1 className="text-3xl font-bold">{paid ? 'Ödemeniz doğrulandı' : 'Ödeme durumu'}</h1>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {order && <><p>{paid ? `${order.creditsRemaining} sınav hakkı hesabınıza tanımlandı.` : 'Ödeme henüz sunucuda doğrulanmadı. Bu sayfaya dönüş tek başına ödemenin başarılı olduğunu göstermez.'}</p>
      <p className="break-all">Sipariş: {order.id}</p><p>{(order.amount / 100).toFixed(2)} {order.currency}</p>
      <a className="underline block" href={`/api/payments/orders/${encodeURIComponent(order.id)}/receipt`} download>Sipariş belgesini indir</a>
      <a className="underline block" href={`mailto:hello@b4skills.com?subject=${encodeURIComponent(`İade/cayma talebi — ${order.id}`)}`}>İade veya cayma bildirimi gönder</a>
      <a className="underline block" href="/refund-policy">İade ve cayma politikası</a></>}
    {!paid && <button className="rounded-lg border p-3" onClick={() => setRevision(r => r + 1)}>Ödeme durumunu yeniden kontrol et</button>}
    <a href="/dashboard" className="inline-block bg-indigo-600 text-white px-5 py-3 rounded-xl">Hesabıma dön</a>
  </main><SiteFooter /></div>;
}
