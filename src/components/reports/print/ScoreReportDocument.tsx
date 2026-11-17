import React from 'react';
import { t } from '../../../lib/reporting/report-copy';
import { formatSourceDate } from '../../../lib/reporting/external-equivalences';
import { fmtDate, LOGO_SRC, useBrandFont, useQr, Watermark, type ReportDocumentData } from './shared';

const PAGES = 3;
const pct = (v: number) => `${Math.max(0, Math.min(100, v / 10))}%`;

function Footer({ doc, page }: { doc: ReportDocumentData; page: number }) {
  const L = doc.locale;
  return (
    <footer className="b4p-footer">
      <span>b4skills · {t('confidential', L)} · {doc.candidateName}</span>
      <span>www.b4skills.com</span>
      <span>{t('page', L)} {page} / {PAGES}</span>
    </footer>
  );
}

function Hero({ doc }: { doc: ReportDocumentData }) {
  const L = doc.locale;
  const yl = doc.audience === 'young_learner';
  return (
    <header className="b4p-hero">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4mm' }}>
        <img className="b4p-logo" src={LOGO_SRC} alt="b4skills" />
        <span className="b4p-pill" style={{ alignSelf: 'flex-start' }}>{yl ? t('studentReport', L) : t('candidateReport', L)}</span>
        <h1>{doc.candidateName}<br /><span className="gold">{t('overall', L)} CEFR {doc.overall.cefrLabel}{doc.overall.group ? ` · ${doc.overall.group}` : ''}</span></h1>
        <p className="lede">{doc.overall.summary ?? ''}</p>
        <p className="lede" style={{ fontSize: '8.4pt' }}>{doc.test.product} · {fmtDate(doc.test.completedAt, L)}{doc.issuer.name !== 'b4skills' ? ` · ${doc.issuer.name}` : ''}</p>
      </div>
      <div className="b4p-card-white" style={{ width: '78mm', alignSelf: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3mm' }}>
          <div>
            <div className="b4p-eyebrow">{t('skillProfile', L)}</div>
            <div style={{ fontWeight: 800, fontSize: '10pt', marginTop: '1mm' }}>{t('scaleScore', L)}</div>
            <div style={{ fontSize: '17pt', fontWeight: 800, color: 'var(--magenta)', lineHeight: 1.1 }}>{doc.overall.beps ?? '—'}<span style={{ fontSize: '8pt', color: 'var(--muted)', fontWeight: 600 }}> / 1000</span></div>
          </div>
          <div className="b4p-badge" style={{ width: '20mm', height: '20mm' }}><b style={{ fontSize: '17pt' }}>{doc.overall.cefrLabel}</b><small>{L === 'tr' ? 'Genel' : 'Overall'}</small></div>
        </div>
        <div className="b4p-bars">
          {doc.skills.map(s => (
            <React.Fragment key={s.skill}>
              <span>{s.label}</span>
              <span className="b4p-bar"><i style={{ width: s.beps !== null ? pct(s.beps) : '0%' }} /></span>
              {s.cefrLabel ? <span className="lvl">{s.cefrLabel}</span> : <span className="na">—</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </header>
  );
}

export function ScoreReportDocument({ doc }: { doc: ReportDocumentData }) {
  useBrandFont();
  const L = doc.locale;
  const yl = doc.audience === 'young_learner';
  const qr = useQr(doc.verification.verificationUrl);
  const mark = doc.sample ? <Watermark text={L === 'tr' ? 'ÖRNEK' : 'SAMPLE'} /> : null;
  const banner = doc.sample ? t('sample', L) : doc.overall.provisional ? t('provisional', L) : null;
  const stateLabel = (state: string) => state === 'Scoring pending' ? t('scoringPending', L) : state === 'Not assessed' ? t('notAssessed', L) : t('unavailable', L);
  const ladder = doc.ladder;
  const iv = doc.overall.interval;

  return (
    <div lang={L} id="b4-report" style={{ display: "contents" }}>
      {/* ── Page 1: result overview + skill profile ─────────────────────── */}
      <section className="b4p-page" aria-label={`${t('reportTitle', L)} 1`}>
        {mark}
        <Hero doc={doc} />
        {banner && <div className="b4p-banner" role="note">{banner}</div>}

        <h2 className="b4p-h2">{t('overall', L)}</h2>
        <div className="b4p-grid c3">
          <div className="b4p-soft">
            <h3>{t('cefrLevel', L)}</h3>
            <div className="sub">{doc.overall.group ?? '—'}</div>
            <p style={{ fontSize: '22pt', fontWeight: 800, color: 'var(--magenta)', marginTop: '1mm' }}>{doc.overall.cefrLabel}</p>
            <span className="b4p-disc coral">1</span>
          </div>
          <div className="b4p-soft">
            <h3>{t('scaleScore', L)}</h3>
            <div className="sub">{t('scaleNote', L)}</div>
            <p style={{ fontSize: '22pt', fontWeight: 800, color: 'var(--magenta)', marginTop: '1mm' }}>{doc.overall.beps ?? '—'}</p>
            <span className="b4p-disc">2</span>
          </div>
          <div className="b4p-soft">
            <h3>{t('precision', L)}</h3>
            <div className="sub">{t('interval', L)}</div>
            <p style={{ fontSize: '12pt', fontWeight: 800, color: 'var(--ink)', marginTop: '2mm' }}>
              {iv ? `${iv.lower}–${iv.upper}` : '—'}
            </p>
            <p style={{ marginTop: '.6mm' }}>{iv ? `CEFR ${iv.cefrLowerLabel}${iv.cefrLowerLabel !== iv.cefrUpperLabel ? `–${iv.cefrUpperLabel}` : ''} · ${t('sem', L)} ${doc.overall.sem?.toFixed(2)}` : ''}</p>
            <span className="b4p-disc">3</span>
          </div>
        </div>

        <h2 className="b4p-h2">{t('skillProfile', L)}</h2>
        <p className="b4p-lead">{t('skillProfileLead', L)}</p>
        <div className="b4p-ladder">
          <div className="b4p-ladder-head">
            <span />
            <div className="b4p-scale">
              {ladder.map(z => <span key={z.level} style={{ left: pct(z.from), width: `calc(${pct(z.to)} - ${pct(z.from)})` }}>{z.label}</span>)}
            </div>
            <span>CEFR</span><span>SEM (θ)</span>
          </div>
          {doc.skills.map(s => (
            <div className="b4p-ladder-row" key={s.skill}>
              <div className="name"><b>{s.label}</b>{s.items !== null && <small>{s.items} {t('items', L).toLowerCase()}</small>}</div>
              <div className="b4p-track">
                <div className="zones">{ladder.map(z => <span key={z.level} style={{ left: pct(z.from), width: `calc(${pct(z.to)} - ${pct(z.from)})` }} />)}</div>
                {s.band && <div className="ci" style={{ left: pct(s.band.lower), width: `calc(${pct(s.band.upper)} - ${pct(s.band.lower)})` }} />}
                {s.beps !== null && s.cefr && <div className="pt" style={{ left: pct(s.beps) }} />}
              </div>
              {s.cefrLabel ? <span className="lvl">{s.cefrLabel}</span> : <span className="state">{stateLabel(s.state)}</span>}
              <span className="sem">{s.sem !== null && s.cefr ? s.sem.toFixed(2) : '—'}</span>
            </div>
          ))}
        </div>
        <p className="b4p-note" style={{ marginTop: '2.4mm' }}>
          {L === 'tr'
            ? 'SEM, θ ölçeğindeki ölçme standart hatasıdır; gölgeli bant ±1,96 × SEM aralığıdır. Dil bilgisi ve kelime, iletişim becerilerini destekleyen dil yapılarıdır. Ölçülmeyen bir beceriye genel seviye atanmaz.'
            : 'SEM is the standard error of measurement on the θ scale; the shaded band spans ±1.96 × SEM. Grammar and vocabulary are supporting language constructs. An unmeasured skill is never given the overall level.'}
        </p>
        <Footer doc={doc} page={1} />
      </section>

      {/* ── Page 2: can-do, strengths, next steps ───────────────────────── */}
      <section className="b4p-page" aria-label={`${t('reportTitle', L)} 2`}>
        {mark}
        <h2 className="b4p-h2" style={{ marginTop: '2mm' }}>{t('whatYouCanDo', L)}</h2>
        <p className="b4p-lead">{t('canDoLead', L)}</p>
        <div className="b4p-grid c2">
          {doc.skills.map((s, i) => (
            <div className="b4p-soft" key={s.skill}>
              <h3>{s.label}</h3>
              <div className="sub">{s.cefrLabel ? `CEFR ${s.cefrLabel}` : stateLabel(s.state)}</div>
              <p>{s.canDo ?? (L === 'tr' ? 'Bu beceri için seviye tanımı verilemez.' : 'No level description is available for this skill.')}</p>
              {s.nextText && <div className="b4p-target"><b>{t('nextTarget', L)}{s.nextLevel ? ` (${s.nextLevel})` : ''}:</b> {s.nextText}</div>}
              <span className="b4p-disc">{i + 1}</span>
            </div>
          ))}
        </div>

        <div className="b4p-grid" style={{ gridTemplateColumns: '78mm 1fr', marginTop: '6mm', alignItems: 'start' }}>
          <div className="b4p-dark">
            <h3>{t('strengths', L)}</h3>
            {doc.strengths.length ? (
              <>
                <p className="muted">{t('strengthsLead', L)}</p>
                <ul>{doc.strengths.map(s => <li key={s.skill}><b>{s.label} · {s.cefrLabel}</b><br />{s.canDo}</li>)}</ul>
              </>
            ) : <p className="muted" style={{ marginTop: '2mm' }}>{L === 'tr' ? 'Beceriler aynı seviyede raporlandı; belirgin bir öne çıkan beceri yok.' : 'Skills were reported at the same level; no single skill stands out.'}</p>}
          </div>
          <div>
            <h2 className="b4p-h2" style={{ marginTop: 0 }}>{t('nextSteps', L)}</h2>
            <p className="b4p-lead">{t('nextStepsLead', L)}</p>
            <div className="b4p-grid">
              {doc.nextSteps.map((s, i) => (
                <div className="b4p-step" key={s.skill}>
                  <h3><i>{i + 1}</i>{s.label} · {s.cefrLabel}</h3>
                  <p>{s.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="b4p-note" style={{ marginTop: '4mm' }}>
          {L === 'tr' ? 'Kaynak: Avrupa Konseyi, CEFR Ek Cilt (2020). Tanımlar platformun kısa açıklamalarıdır; hedefler öğrenme amaçlıdır, puan tahmini değildir.' : 'Source: Council of Europe, CEFR Companion Volume (2020). Descriptors are short platform paraphrases; targets are learning goals, not predicted results.'}
        </p>
        <Footer doc={doc} page={2} />
      </section>

      {/* ── Page 3: rubric, equivalences, test info, verification ───────── */}
      <section className="b4p-page" aria-label={`${t('reportTitle', L)} 3`}>
        {mark}
        <h2 className="b4p-h2" style={{ marginTop: '2mm' }}>{t('rubric', L)}</h2>
        <p className="b4p-lead">{doc.rubrics.length ? t('rubricLead', L) : t('rubricNone', L)}</p>
        {doc.rubrics.length > 0 && (
          <div className="b4p-rubric">
            {doc.rubrics.map(r => (
              <div className="b4p-soft" key={r.skill}>
                <h3>{doc.skills.find(s => s.skill === r.skill)?.label ?? r.skill}</h3>
                <div className="sub">{r.tasks} {t('tasksScored', L)}</div>
                <div className="rows">
                  {r.dimensions.map(d => (
                    <React.Fragment key={d.key}>
                      <span>{d.label}</span>
                      <span className="b4p-bar"><i style={{ width: `${d.mean * 10}%` }} /></span>
                      <span className="v">{d.mean.toFixed(1)}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="b4p-h2">{yl ? t('indicativeYL', L) : t('indicative', L)}</h2>
        {doc.equivalences ? (
          <>
            <p className="b4p-lead">{doc.equivalences.disclaimer}</p>
            <table className="b4p-table">
              <thead><tr><th>{L === 'tr' ? 'Sınav' : 'Test'}</th><th>{L === 'tr' ? `CEFR ${doc.overall.cefrLabel} karşılığı` : `At CEFR ${doc.overall.cefrLabel}`}</th><th>{L === 'tr' ? 'Ölçek' : 'Scale'}</th></tr></thead>
              <tbody>
                {doc.equivalences.rows.map(r => (
                  <tr key={r.test} className="hl">
                    <td>{r.label}</td>
                    <td>{r.range ? <span className="big">{r.range}</span> : <span className="small">{L === 'tr' ? 'Bu seviyede yayımlanmış eşleme yok' : 'No published alignment at this level'}</span>}{r.note && <div className="small">{r.note}</div>}</td>
                    <td className="small">{r.scale}{r.secondary ? <><br />{r.secondary}</> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="b4p-note" style={{ marginTop: '1.6mm' }}>
              {t('sources', L)}: {doc.equivalences.sources.map((s, i) => <React.Fragment key={s.test}>{i > 0 && '; '}{s.publisher.split(' (')[0]}, “{s.title}”, {formatSourceDate(s, L)}, <a href={s.url}>{s.url}</a></React.Fragment>)}.
            </p>
          </>
        ) : <p className="b4p-lead">{t('equivalenceHidden', L)}</p>}

        <div className="b4p-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '5mm', alignItems: 'start' }}>
          <div>
            <h2 className="b4p-h2" style={{ marginTop: 0 }}>{t('testInfo', L)}</h2>
            <dl className="b4p-kv">
              <dt>{t('product', L)}</dt><dd>{doc.test.product}</dd>
              {doc.test.ageRange && <><dt>{t('ageGroup', L)}</dt><dd>{doc.test.ageRange} {t('years', L)}</dd></>}
              {doc.test.levelRange && <><dt>{t('levelRange', L)}</dt><dd>{doc.test.levelRange}</dd></>}
              <dt>{t('date', L)}</dt><dd>{fmtDate(doc.test.completedAt, L)}</dd>
              <dt>{t('duration', L)}</dt><dd>{doc.test.durationMinutes !== null ? `${doc.test.durationMinutes} ${t('minutes', L)}` : '—'}</dd>
              {doc.test.scoredTasks !== null && <><dt>{t('itemsAdministered', L)}</dt><dd>{doc.test.scoredTasks}</dd></>}
              <dt>{t('method', L)}</dt><dd>{doc.test.method === 'mst' ? t('methodMst', L) : t('methodCat', L)}</dd>
              {doc.test.sections.length > 0 && <><dt>{t('sections', L)}</dt><dd>{doc.test.sections.join(' · ')}</dd></>}
            </dl>
          </div>
          <div>
            <h2 className="b4p-h2" style={{ marginTop: 0 }}>{t('measurement', L)}</h2>
            <p className="b4p-note" style={{ fontSize: '7.6pt' }}>{t('uncertaintyNote', L)}</p>
            <p className="b4p-note" style={{ fontSize: '7.6pt', marginTop: '1.4mm' }}>{t('cutScoreNote', L)}</p>
            <p className="b4p-note" style={{ fontSize: '7.6pt', marginTop: '1.4mm' }}>
              {t('thetaNote', L)}: θ = {doc.overall.theta !== null ? doc.overall.theta.toFixed(2) : '—'}, SEM = {doc.overall.sem !== null ? doc.overall.sem.toFixed(2) : '—'}; BEPS = 125 × (θ + 4), 0–1000.
            </p>
          </div>
        </div>

        <h2 className="b4p-h2">{t('verification', L)}</h2>
        <div className="b4p-cta">
          {qr ? <img className="qr" src={qr} alt={t('scanToVerify', L)} /> : <div className="qr-ph">{t('noVerification', L)}</div>}
          <div>
            <b>{doc.verification.verificationUrl ? t('verificationLead', L) : t('noVerification', L)}</b>
            <div className="code">
              {doc.verification.reportId && <>{t('reportId', L)}: {doc.verification.reportId}<br /></>}
              {t('assessmentId', L)}: {doc.verification.sessionId}<br />
              {t('validUntil', L)}: {fmtDate(doc.verification.validUntil, L)} · {t('generated', L)}: {fmtDate(doc.generatedAt, L)}
            </div>
          </div>
          {doc.verification.verificationUrl && <span className="b4p-btn">{t('verifyAt', L)}<br /><span style={{ fontWeight: 600, fontSize: '7.4pt' }}>{doc.verification.verificationUrl.replace(/^https?:\/\//, '')}</span></span>}
        </div>
        <Footer doc={doc} page={3} />
      </section>
    </div>
  );
}
