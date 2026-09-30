// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { VerificationPage } from '../VerificationPage';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });
it('shows an expired certificate as expired, not missing or valid', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ valid: false, expired: true, certificateId: 'expired', candidateName: 'Test Candidate' })));
  render(<VerificationPage certId="expired" />);
  expect(await screen.findByText('Certificate Expired')).toBeTruthy();
  expect(screen.getByText('Test Candidate')).toBeTruthy();
  expect(screen.queryByText('Certificate Not Found')).toBeNull();
  expect(screen.queryByText('Valid Certificate')).toBeNull();
});
it('shows verified details for a valid certificate', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ valid: true, certificateId: 'valid', cefrLevel: 'B2' })));
  render(<VerificationPage certId="valid" />);
  expect(await screen.findByText('Valid Certificate')).toBeTruthy();
});
it('keeps a genuine 404 distinct from service failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ valid: false, error: 'Certificate not found' }, 404)));
  render(<VerificationPage certId="missing" />);
  expect(await screen.findByText('Certificate Not Found')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});
it.each([503, 500])('does not describe a %s failure as a missing certificate', async status => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ valid: false, error: 'Service unavailable' }, status)));
  render(<VerificationPage certId="check" />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('Certificate Not Found')).toBeNull();
});
it('rejects malformed verification results', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ valid: 'true' })));
  render(<VerificationPage certId="check" />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('Valid Certificate')).toBeNull();
});
it('ignores a stale response when navigating to another certificate', async () => {
  let resolveFirst!: (value: unknown) => void;
  const first = new Promise(resolve => { resolveFirst = resolve; });
  vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(first).mockResolvedValue(response({ valid: true, certificateId: 'new', candidateName: 'New Candidate' })));
  const { rerender } = render(<VerificationPage certId="old" />);
  rerender(<VerificationPage certId="new" />);
  expect(await screen.findByText('New Candidate')).toBeTruthy();
  await act(async () => { resolveFirst(response({ valid: true, certificateId: 'old', candidateName: 'Old Candidate' })); });
  expect(screen.queryByText('Old Candidate')).toBeNull();
});
it('ends a hanging request with a retryable timeout message', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
  })));
  render(<VerificationPage certId="slow" />);
  await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
  expect(screen.getByText('Verification timed out. Please try again.')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Verify' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
  expect(screen.queryByRole('alert')).toBeNull();
});
