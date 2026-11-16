import { describe, expect, it } from 'vitest';
import { CONSENT_VERSION, consentStatus } from '../src/lib/compliance/guardian-consent';
import { requiresConsentGate } from '../src/routes/guardian-consent';
describe('consent admission', () => {
  const approved = { ageBand: 'UNDER_13', policyVersion: CONSENT_VERSION, approvedAt: new Date(), verifiedAt: new Date(), revokedAt: null };
  it('fails closed for missing age, stale policies and unverified email declarations', () => {
    expect(consentStatus(null).allowed).toBe(false);
    expect(consentStatus({ ...approved, policyVersion: 'old' }).allowed).toBe(false);
    expect(consentStatus({ ...approved, approvedAt: null }).status).toBe('GUARDIAN_REQUIRED');
    expect(consentStatus({ ...approved, verifiedAt: null }).status).toBe('SCHOOL_VERIFICATION_REQUIRED');
  });
  it.each(['UNDER_13', '13_17'])('requires both guardian decision and school verification for %s', ageBand => {
    expect(consentStatus({ ...approved, ageBand }).allowed).toBe(true);
    expect(consentStatus({ ...approved, ageBand, revokedAt: new Date() }).allowed).toBe(false);
  });
  it('does not allow adult self-declaration to bypass a known child programme', () => {
    const adult = { ageBand: 'ADULT', policyVersion: CONSENT_VERSION };
    expect(consentStatus(adult).allowed).toBe(true);
    expect(consentStatus(adult, 'Primary (7-10)').allowed).toBe(false);
    expect(consentStatus({ ...adult, guardianRequired: true }).allowed).toBe(false);
  });
  it.each(['/api/sessions/launch', '/api/sessions/id/next', '/api/sessions/id/respond', '/api/sessions/id/identity-snapshot',
    '/api/sessions/diagnostic/launch', '/api/proctoring/evidence/commit', '/api/proctoring/event', '/api/speaking/transcribe',
    '/api/fixed-forms/ozgun-kids/launch', '/api/assessment/policy'])('covers direct sensitive endpoint %s', path => expect(requiresConsentGate(path)).toBe(true));
  it.each(['/api/guardian-consent/request', '/api/auth/delete-account', '/api/auth/logout', '/privacy'])('keeps consent and account controls accessible: %s', path => expect(requiresConsentGate(path)).toBe(false));
});
