import React from 'react';
import { LEVEL_ORDER, levelLabel, t } from '../../../lib/reporting/report-copy';
import { formatSourceDate } from '../../../lib/reporting/external-equivalences';
import { fmtDate, LOGO_SRC, useBrandFont, useQr, Watermark, type ReportDocumentData } from './shared';

/**
 * One-page A4 landscape certificate. Render only when certificateAvailable()
 * is true (final, verified result); `doc.sample` watermarks design previews.
 */
export function CertificateDocument({ doc }: { doc: ReportDocumentData }) {
  useBrandFont();
  const L = doc.locale;
  const qr = useQr(doc.verification.verificationUrl);
  const yl = doc.audience === 'young_learner';
  const eq = doc.equivalences;
  const issuedByOrg = doc.issuer.name !== 'b4skills';

  return (
    <section className="b4p-page landscape" id="b4-certificate" aria-label={t('certificateTitle', L)} lang={L}>
      {doc.sample && <Watermark text={L === 'tr' ? 'ÖRNEK · GEÇERSİZ' : 'SAMPLE · NOT VALID'} />}
      <div className="b4c">
        <aside className="b4c-side">
          <img className="b4p-logo" src={LOGO_SRC} alt="b4skills" />
          <div className="b4p-badge" role="img" aria-label={`${t('cefrLevel', L)} ${doc.overall.cefrLabel}`}>
            <b>{doc.overall.cefrLabel}</b><small>CEFR</small>
          </div>
          <div className="group">{doc.overall.group}</div>
          <p className="sum">{doc.overall.summary}</p>
          <div className="scale" aria-hidden="true">
            {LEVEL_ORDER.map(l => <span key={l} className={l === doc.overall.cefr ? 'on' : ''}>{levelLabel(l)}</span>)}
          </div>
        </aside>

        <div className="b4c-main">
          <span className="b4p-pill" style={{ alignSelf: 'flex-start' }}>{L === 'tr' ? 'Sertifika' : 'Certificate'}</span>
          <h1>{t('certificateTitle', L)}</h1>
          <p className="certify">{t('certifies', L)}</p>
          <p className="name">{doc.candidateName}</p>
          <p className="ach">{yl ? t('achievedYL', L) : t('achieved', L)} <b style={{ color: 'var(--magenta)' }}>CEFR {doc.overall.cefrLabel}</b>{yl ? t('achievedPostYL', L) : t('achievedPost', L)}</p>

          <div className="b4c-meta">
            <div><small>{t('test', L)}</small><b>{doc.test.product}</b></div>
            <div><small>{t('testDate', L)}</small><b>{fmtDate(doc.test.completedAt, L)}</b></div>
            <div><small>{t('validUntil', L)}</small><b>{fmtDate(doc.verification.validUntil, L)}</b></div>
          </div>

          <div className="b4c-skills" aria-label={L === 'tr' ? 'Beceri seviyeleri' : 'Skill levels'}>
            {doc.skills.filter(s => s.cefrLabel).map(s => <span key={s.skill}>{s.label}<b>{s.cefrLabel}</b></span>)}
          </div>

          {eq && (
            <div style={{ marginTop: '5mm' }}>
              <div className="b4p-eyebrow" style={{ marginBottom: '2mm' }}>
                {yl ? t('indicativeYL', L) : t('indicative', L)} · {t('notOfficial', L)}
              </div>
              <div className="b4p-eq" style={yl ? { gridTemplateColumns: '1fr' } : undefined}>
                {eq.rows.map(r => (
                  <div className="tile" key={r.test}>
                    <h4>{r.label}</h4>
                    {r.range ? <b>{r.range}</b> : <b className="none">{L === 'tr' ? 'Bu seviyede yayımlanmış eşleme yok' : 'No published alignment at this level'}</b>}
                    <small>{r.scale}{r.secondary ? ` · ${r.secondary}` : ''}</small>
                  </div>
                ))}
              </div>
              <p className="b4p-note" style={{ marginTop: '2mm' }}>
                * {eq.disclaimer} {t('sources', L)}: {eq.sources.map(s => `${s.publisher.split(' (')[0]}, “${s.title.split(':')[0].split(' (')[0]}” (${formatSourceDate(s, L)})`).join('; ')}.
              </p>
            </div>
          )}

          <div className="b4c-foot">
            {qr ? <img className="qr" src={qr} alt={t('scanToVerify', L)} /> : <div className="b4p-cta"><div className="qr-ph">QR</div></div>}
            <div className="ids">
              <div>{t('certificateId', L)}: <b>{doc.verification.certificateId ?? '—'}</b></div>
              <div>{t('verifyAt', L)}: <b>{doc.verification.verificationUrl?.replace(/^https?:\/\//, '') ?? '—'}</b></div>
              <div style={{ marginTop: '1mm' }}>{t('cutScoreNote', L)}</div>
            </div>
            <div className="issuer">
              {issuedByOrg && doc.issuer.logoUrl && <img src={doc.issuer.logoUrl} alt="" />}
              {t('issuedBy', L)}<b>{doc.issuer.name}</b>
              {issuedByOrg && <span>{t('poweredBy', L)}</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
