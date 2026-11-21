import React, { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

/** Must match ACCOUNT_DELETION_CONFIRMATION in src/lib/compliance/account-deletion.ts. */
const CONFIRM = 'DELETE_MY_ACCOUNT';

const MESSAGES: Record<string, string> = {
  password_required: 'Parolanızı girin. / Enter your password.',
  invalid_password: 'Parola yanlış. / The password is incorrect.',
  staff_account: 'Personel hesapları kurum yöneticisi tarafından silinir. / Staff accounts are removed by your administrator.',
  rate_limited: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin. / Too many attempts. Try again in 15 minutes.',
};

/**
 * Self-service candidate account deletion on the web (same endpoint as the iPad/Mac app).
 * Shown to candidates only; the server enforces the role and password checks.
 */
export function DeleteAccountButton({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)}
      className="mt-3 flex items-center gap-2 text-slate-400 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-widest w-full">
      <Trash2 size={18} /> Hesabımı sil / Delete account
    </button>
    {open && <DeleteAccountDialog onClose={() => setOpen(false)} onDeleted={onDeleted} />}
  </>;
}

export function DeleteAccountDialog({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pending) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed || pending) return;
    setPending(true); setError(null);
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM, ...(password ? { password } : {}) }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(MESSAGES[data?.code] ?? 'Hesap silinemedi. Lütfen tekrar deneyin. / Account deletion failed. Please try again.');
      onDeleted();
    } catch (err) {
      setError(err instanceof Error && err.name !== 'TimeoutError' && err.name !== 'TypeError' ? err.message
        : 'Bağlantı sorunu. Lütfen tekrar deneyin. / Connection problem. Please try again.');
      setPending(false);
    }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/60" aria-hidden="true" onClick={() => { if (!pending) onClose(); }} />
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="delete-account-title"
      className="relative w-full max-w-md rounded-2xl bg-white p-6 text-slate-800 shadow-xl space-y-4">
      <h2 id="delete-account-title" className="text-xl font-bold">Hesabımı sil / Delete my account</h2>
      <p className="text-sm leading-6">Hesabınız, sınav yanıtlarınız, ses ve kamera kayıtlarınız, raporlarınız ve veli onay bilgileriniz silinir. Bu işlem geri alınamaz. Ayrıntılar: <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Gizlilik politikası</a>.</p>
      <p className="text-sm leading-6 text-slate-600">Your account, answers, recordings, reports and guardian consent records are deleted. This cannot be undone.</p>
      <label className="block text-sm font-medium">
        Parola (parolayla giriş yaptıysanız) / Password, if you sign in with one
        <input ref={firstField} type="password" autoComplete="current-password" value={password}
          onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
      </label>
      <label className="flex gap-3 items-start text-sm">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        <span>Hesabımın kalıcı olarak silineceğini anlıyorum. / I understand my account will be permanently deleted.</span>
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={pending} className="rounded-lg border px-4 py-2 text-sm">Vazgeç / Cancel</button>
        <button type="submit" disabled={!confirmed || pending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? 'Siliniyor… / Deleting…' : 'Kalıcı olarak sil / Delete permanently'}
        </button>
      </div>
    </form>
  </div>;
}
