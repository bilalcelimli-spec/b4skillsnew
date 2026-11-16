// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CandidateProfile } from '../CandidateProfile';

const user = { uid: 'u1', email: 'ada@example.com', displayName: 'Ada Lovelace', role: 'CANDIDATE', organizationId: 'org1', organizationName: 'Acme School', createdAt: '2026-01-05T00:00:00.000Z' };
const finalSession = { id: 'real-1', status: 'COMPLETED', completedAt: '2026-10-01T10:00:00.000Z', metadata: { productLine: 'General English' },
  scoreReport: { overallCefr: 'B2', isVerified: true, diagnosticReport: { scoringComplete: true } } };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('renders the account and history from the API instead of placeholder sessions', async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [finalSession, { id: 'live', status: 'IN_PROGRESS', metadata: {} }] }));
  vi.stubGlobal('fetch', fetchMock);
  const onOpenReport = vi.fn();
  render(<CandidateProfile user={user} onLogout={() => {}} onOpenReport={onOpenReport} />);
  expect(fetchMock).toHaveBeenCalledWith('/api/candidates/u1/history', expect.objectContaining({ credentials: 'include' }));
  const rows = await screen.findAllByTestId('profile-history-row');
  expect(rows).toHaveLength(1);
  expect(screen.getByText('B2')).toBeTruthy();
  expect(screen.getByText('Acme School')).toBeTruthy();
  expect(screen.queryByText(/sess_1|sess_2/)).toBeNull();
  fireEvent.click(rows[0]);
  expect(onOpenReport).toHaveBeenCalledWith('real-1');
});

it('shows an empty state for a new candidate', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })));
  render(<CandidateProfile user={{ ...user, organizationId: null, organizationName: null }} onLogout={() => {}} />);
  expect(await screen.findByTestId('profile-history-empty')).toBeTruthy();
  expect(screen.getByText('Independent')).toBeTruthy();
});

it('offers a retry when history cannot be loaded', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    .mockResolvedValueOnce({ ok: true, json: async () => [finalSession] });
  vi.stubGlobal('fetch', fetchMock);
  render(<CandidateProfile user={user} onLogout={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: /try again/i }));
  expect(await screen.findAllByTestId('profile-history-row')).toHaveLength(1);
});
