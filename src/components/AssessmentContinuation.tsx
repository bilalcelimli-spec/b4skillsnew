import React, {useEffect, useState} from 'react';
import {Clock3, PauseCircle} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from './ui/Button';

/** The server enforces deadlines; this clock keeps the visible state up to date. */
export function AssessmentResumeCard({title, status, pause, onResume}: {
  title: string; status: string; pause?: {used?: boolean; resumeUntil?: string | null}; onResume?: () => void;
}) {
  const {t} = useTranslation();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (status !== 'PAUSED') return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status, pause?.resumeUntil]);
  const deadline = pause?.resumeUntil ? Date.parse(pause.resumeUntil) : NaN;
  const expired = status === 'EXPIRED' || (status === 'PAUSED' && !(now < deadline));
  const remaining = Math.max(0, Math.ceil((deadline - now) / 60000));
  return <section aria-label={title} className="mb-4 rounded-2xl border border-indigo-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
      <h2 className="font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-600 mt-1">{expired
        ? t('exam.resumeExpired', {defaultValue: 'The 48-hour resume window has expired. This attempt can no longer be resumed.'})
        : status === 'PAUSED'
          ? t('exam.resumeDeadline', {defaultValue: 'Resume before {{date}}. Your remaining exam time is preserved.', date: new Date(deadline).toLocaleString()})
          : pause?.used
            ? t('exam.noMorePauses', {defaultValue: 'Your exit allowance has been used. Complete this attempt without another pause.'})
            : t('exam.exitTimerNotice', {defaultValue: 'You may leave once and resume within 48 hours.'})}</p>
      {status === 'PAUSED' && !expired && <p className="flex items-center gap-1.5 mt-2 text-sm font-semibold text-indigo-700"><Clock3 size={16} aria-hidden="true"/>{t('exam.resumeRemaining', {defaultValue: '{{hours}}h {{minutes}}m left to resume', hours: Math.floor(remaining / 60), minutes: remaining % 60})}</p>}
    </div>
    {onResume && <Button disabled={expired} onClick={onResume}>{t('exam.resume', {defaultValue: 'Resume exam'})}</Button>}
  </section>;
}

export function PausedAssessmentNotice({pause, onDashboard}: {
  pause?: {used?: boolean; resumeUntil?: string | null}; onDashboard?: () => void;
}) {
  const {t} = useTranslation();
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="w-full max-w-xl">
      <PauseCircle className="text-indigo-600 mb-4" size={40} aria-hidden="true"/>
      <AssessmentResumeCard title={t('exam.pausedTitle', {defaultValue: 'Your exam is paused'})} status="PAUSED" pause={pause}/>
      <p className="text-sm text-slate-600 mb-6">{t('exam.pausedElsewhere', {defaultValue: 'This attempt was paused in another window. Return to the dashboard to resume it.'})}</p>
      {onDashboard && <Button onClick={onDashboard}>{t('exam.backToDashboard', {defaultValue: 'Back to dashboard'})}</Button>}
    </div>
  </main>;
}
