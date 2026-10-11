import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';

export function ExitAssessmentControl({ onExit, disabled, floating, sessionId, pauseUsed = false, questionNumber }: { onExit: () => void; disabled?: boolean; floating?: boolean; sessionId?: string | null; pauseUsed?: boolean; questionNumber?: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const confirmExit = async () => {
    if (disabled || pauseUsed || savingRef.current) return;
    savingRef.current = true; setSaving(true); setError(null);
    try {
      if (sessionId) {
        const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/pause`, {
          method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(questionNumber === undefined ? {} : {questionNumber}), signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? t('exam.pauseError', {defaultValue: 'Could not pause the exam. Please try again.'}));
      }
      onExit();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('exam.pauseError', {defaultValue: 'Could not pause the exam. Please try again.'}));
    } finally { savingRef.current = false; setSaving(false); }
  };
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); triggerRef.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        event.preventDefault();
        const buttons = cancelRef.current?.parentElement?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (buttons?.length) (document.activeElement === buttons[0] ? buttons[buttons.length - 1] : buttons[0]).focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open]);
  return <>
    <Button ref={triggerRef} variant="outline" size="sm" disabled={disabled || saving || pauseUsed} onClick={() => setOpen(true)}
      className={`bg-white gap-2 shrink-0 ${floating ? "fixed top-4 right-4 z-[60] shadow-lg" : ""}`}>
      <LogOut size={16} />{pauseUsed ? t('exam.pauseUsed', {defaultValue: 'Exit allowance used'}) : t('exam.exit', { defaultValue: 'Exit exam' })}
    </Button>
    {open && createPortal(<div className="fixed inset-0 z-[110] bg-slate-900/40 flex items-center justify-center p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="exam-exit-title" aria-describedby="exam-exit-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="exam-exit-title" className="text-xl font-bold text-slate-900">{t('exam.exitTitle', { defaultValue: 'Leave this exam?' })}</h2>
        <p id="exam-exit-description" className="my-4 text-sm text-slate-600">{t('exam.exitDescription', { defaultValue: 'You can leave once per exam. Your remaining time will be preserved, and you must resume from the dashboard within 48 hours. Submitted answers are saved; unsubmitted answers and recordings may be lost.' })}</p>
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button ref={cancelRef} variant="outline" disabled={saving} onClick={close}>{t('exam.stay', { defaultValue: 'Stay in exam' })}</Button>
          <Button variant="danger" disabled={disabled || saving || pauseUsed} onClick={() => void confirmExit()}>{t('exam.exit', { defaultValue: 'Exit exam' })}</Button>
        </div>
      </section>
    </div>, document.body)}
  </>;
}
