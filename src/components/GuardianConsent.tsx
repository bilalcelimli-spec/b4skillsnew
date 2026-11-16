import React, { useEffect, useState } from 'react';

type State = { allowed: boolean; ageBand: string | null; guardianRequired: boolean; status: string };
async function request(path: string, data?: unknown) {
  const res = await fetch(`/api/guardian-consent/${path}`, { credentials: 'include', ...(data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) });
  const body = await res.json(); if (!res.ok) throw new Error(body.error || 'İşlem tamamlanamadı.'); return body;
}
const shell = 'max-w-xl mx-auto p-6 space-y-5 bg-white rounded-2xl border border-slate-200';
const button = 'px-4 py-3 bg-slate-900 text-white rounded-xl disabled:opacity-50';
export function CandidateConsentGate({ children, onCancel }: { children: React.ReactNode; onCancel?: () => void }) {
  const [state, setState] = useState<State | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false);
  async function act(fn: () => Promise<unknown>) { setBusy(true); setError(''); try { await fn(); setState(await request('status')); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  useEffect(() => { let live = true; request('status').then(v => { if (live) setState(v); }, e => { if (live) setError(e.message); }); return () => { live = false; }; }, []);
  if (state?.allowed) return <>{children}</>;
  return <section className={shell} aria-label="Yaş ve veli onayı">
    <h1 className="text-2xl font-bold">Sınavdan önce yaş ve veli onayı</h1>
    <p>Tam doğum tarihinizi istemiyoruz. 18 yaş altı adaylar için velinin e-posta onayı ve kurumun veli yetkisini doğrulaması gerekir. Bu adımlar tamamlanana kadar sınav, mikrofon ve kamera hazırlığı açılmaz.</p>
    {!state && !error && <p>Onay durumu kontrol ediliyor…</p>}
    {state && !state.ageBand && <div className="flex flex-wrap gap-3">{[['UNDER_13', '13 yaş altı'], ['13_17', '13–17 yaş'], ['ADULT', '18 yaş ve üzeri']].map(([value, label]) => <button className={button} disabled={busy} key={value} onClick={() => void act(() => request('age', { ageBand: value }))}>{label}</button>)}</div>}
    {state?.ageBand && state.status === 'RENEWAL_REQUIRED' && <button className={button} disabled={busy} onClick={() => void act(() => request('age', { ageBand: state.ageBand }))}>Güncel koşullarla devam et</button>}
    {state?.status === 'PROVIDER_CONFIGURATION_REQUIRED' && <p>Çocuk sürümünün veri işleme hazırlıkları sürüyor. Henüz sınav açılamaz veya veli onayı istenemez. Kurumunuzdan bilgi alabilirsiniz.</p>}
    {state?.guardianRequired && state.status !== 'PROVIDER_CONFIGURATION_REQUIRED' && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void act(async () => { await request('request', { email }); setSent(true); }); }}>
      <label className="block">Velinin e-posta adresi<input className="block w-full border p-3 rounded-lg" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
      <button className={button} disabled={busy}>Veliye onay bağlantısı gönder</button>
    </form>}
    {sent && <p role="status">Bağlantı gönderildi. Veliniz onay verdikten sonra kurumunuz veli yetkisini doğrulamalıdır.</p>}
    {state?.status === 'SCHOOL_VERIFICATION_REQUIRED' && <p>Veli e-posta onayı alındı. Kurumunuzun veli yetkisini doğrulaması bekleniyor.</p>}
    {state?.status === 'REVOKED' && <p>Veli onayı geri çekildi. Sınav açılamaz.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="flex gap-3"><button className={button} disabled={busy} onClick={() => void act(async () => {})}>Durumu yenile</button>{onCancel && <button onClick={onCancel}>Geri dön</button>}</div>
    <a href="/privacy" target="_blank" rel="noreferrer">Gizlilik ve veri işleme bilgileri</a>
  </section>;
}

export function GuardianDecisionPage() {
  const [token] = useState(() => window.location.hash.slice(1));
  const [name, setName] = useState(''); const [relationship, setRelationship] = useState('PARENT'); const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [result, setResult] = useState<any>(null);
  const manage = new URLSearchParams(window.location.search).get('manage') === '1';
  useEffect(() => { document.title = 'B4Skills — Veli kararı'; }, []);
  async function decide(approve: boolean) {
    setBusy(true); setError(''); try { setResult(await request(manage ? 'revoke' : 'decision', manage ? { token } : { token, approve, ...(approve ? { guardianName: name, relationship, acknowledged: ack } : {}) })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const withdrawalUrl = result?.manageToken ? `${window.location.origin}/guardian-consent?manage=1#${result.manageToken}` : '';
  return <main className="min-h-screen bg-slate-50 py-10 px-4"><section className={shell}>
    <h1 className="text-2xl font-bold">B4Skills veli onayı</h1>
    <p>Bir aday hesabı sizin e-posta adresinizi veli olarak bildirdi. Talebi tanımıyorsanız onaylamayın. Veli onayı sınava katılma zorunluluğu oluşturmaz.</p>
    <p>Sınav sırasında yazılı yanıtlar ve ses kayıtları puanlama ve transkripsiyon amacıyla OpenAI hizmetlerine aktarılabilir. Sınav güvenliği için kamera fotoğrafları otomatik çekilip kuruma gönderilebilir. Sonuçları yetkili kurum görevlileri görebilir.</p>
    <p>Onay vermeden önce <a className="underline" href="/privacy" target="_blank" rel="noreferrer">gizlilik bilgilerini</a> ve <a className="underline" href="/terms" target="_blank" rel="noreferrer">kullanım koşullarını</a> okuyun. Veli yetkiniz kurum tarafından ayrıca doğrulanmadan sınav açılmaz. Tam kimlik belgesini bu forma yüklemeyin.</p>
    <p>Onayı geri çektiğinizde yeni sınav, yanıt ve kayıt gönderimi durur. Önceden işlenen verilerin silinmesi için <a className="underline" href="mailto:hello@b4skills.com">hello@b4skills.com</a> adresine başvurabilir veya aday hesabındaki “Hesabımı sil” seçeneğini kullanabilirsiniz.</p>
    {!result && !manage && <form className="space-y-4" onSubmit={e => { e.preventDefault(); void decide(true); }}>
      <label className="block">Adınız ve soyadınız<input required minLength={2} maxLength={120} className="block w-full border p-3 rounded-lg" value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="block">Veli yetkisi<select className="block w-full border p-3 rounded-lg" value={relationship} onChange={e => setRelationship(e.target.value)}><option value="PARENT">Anne / baba</option><option value="LEGAL_GUARDIAN">Yasal vasi</option></select></label>
      <label className="flex gap-3"><input type="checkbox" required checked={ack} onChange={e => setAck(e.target.checked)} />Bu adayın yasal velisiyim. Açıklanan sınav, ses, kamera ve AI veri aktarımını okuyup açıkça onaylıyorum.</label>
      <button className={button} disabled={busy || !ack}>Onay ver</button>
      <button type="button" className="ml-4 underline" disabled={busy} onClick={() => void decide(false)}>Onay vermiyorum</button>
    </form>}
    {!result && manage && <button className={button} disabled={busy} onClick={() => void decide(false)}>Veli onayımı geri çek</button>}
    {result && <p role="status">{result.revoked || !result.approved ? 'Onay verilmedi veya geri çekildi. Sınav kapalı kalır.' : 'E-posta onayınız kaydedildi. Kurumun veli yetkisini doğrulaması bekleniyor.'}</p>}
    {withdrawalUrl && <div><p>Onayı geri çekmek için bu kişisel bağlantıyı saklayın. Paylaşmayın.</p><a className="underline break-all" href={withdrawalUrl}>Onayı yönet ve geri çek</a><input aria-label="Saklanacak geri çekme bağlantısı" className="block w-full border p-2" readOnly value={withdrawalUrl} /></div>}
    {error && <p role="alert">{error}</p>}
  </section></main>;
}

export function GuardianVerificationPage() {
  const [rows, setRows] = useState<any[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState(''); const [checked, setChecked] = useState(false);
  async function refresh() { try { const data = await request('pending'); setRows(data.candidates); } catch (e) { setError((e as Error).message); } }
  useEffect(() => { void refresh(); }, []);
  async function verify(userId: string, approvedAt: string) { setBusy(true); setError(''); try { await request('verify', { userId, approvedAt, reference, guardianAuthorityChecked: checked }); setReference(''); setChecked(false); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <main className="min-h-screen bg-slate-50 p-6"><section className={shell}>
    <h1 className="text-2xl font-bold">Veli yetkisi doğrulaması</h1>
    <p>Yalnızca kurumunuzun mevcut kayıtları veya uygun yüz yüze doğrulamasıyla veli yetkisini belirledikten sonra onaylayın. Buraya kimlik belgesi, kimlik numarası veya belge kopyası girmeyin; kurumunuzdaki kontrol kaydının referansını yazın.</p>
    <label className="block">Kurum kontrol kaydı referansı<input className="block w-full border p-3" value={reference} minLength={8} maxLength={200} onChange={e => setReference(e.target.value)} /></label>
    <label className="flex gap-3"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />Onaylayacağım adayın yasal veli yetkisini kurum kayıtlarından doğruladım.</label>
    {rows.map(row => <article key={row.userId} className="border rounded-lg p-4 space-y-2"><h2 className="font-bold">{row.user.name || row.userId}</h2><p>{row.guardianName} · {row.guardianEmail}</p><p>{row.relationship === 'PARENT' ? 'Anne / baba' : 'Yasal vasi'}</p><button className={button} disabled={busy || !checked || reference.trim().length < 8} onClick={() => void verify(row.userId, row.approvedAt)}>Bu adayın veli yetkisini doğrula</button></article>)}
    {!error && !rows.length && <p>Bekleyen e-posta onayı bulunmuyor.</p>}
    {error && <p role="alert">{error}</p>}<a href="/">Hesabıma dön</a>
  </section></main>;
}
