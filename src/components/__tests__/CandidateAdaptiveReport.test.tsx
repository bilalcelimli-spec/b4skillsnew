// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
const scoring = vi.hoisted(() => ({ hook: vi.fn(() => ({ state: 'complete' })) }));
vi.mock('../../hooks/useScoringStatus', () => ({ useScoringStatus: scoring.hook }));
vi.mock('../../hooks/useToast.js', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../AITutorOverlay', () => ({ AITutorOverlay: () => <div>AI tutor</div> }));
import { CandidateAdaptiveReport } from '../CandidateAdaptiveReport';
const base = { sessionId: 'session', completedAt: '', finalTheta: 0, finalSem: 1, cefrLevel: 'B1',
  totalItems: 1, responses: [], skillScores: [], stopReason: 'ALL_SECTIONS_COMPLETE',
  scoringComplete: false, reportStatus: 'Provisional', hasScoredEvidence: false, hasPendingAI: false };
function show(data: typeof base) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data })));
  render(<CandidateAdaptiveReport sessionId="session" />);
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('does not turn the unmeasured prior into a score or Can-Do proficiency claim', async () => {
  show(base);
  expect(await screen.findByText('Result unavailable')).toBeTruthy();
  expect(screen.queryByText('500')).toBeNull();
  expect(screen.queryByText('AI tutor')).toBeNull();
  expect((screen.getByRole('button', { name: 'Can-Do' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText('This report is not final.')).toBeTruthy();
  expect(screen.queryByText(/48 hours/)).toBeNull();
});
it('distinguishes an actual pending evaluation from a report needing review', async () => {
  show({ ...base, hasScoredEvidence: true, hasPendingAI: true });
  expect(await screen.findByText('Responses are being evaluated.')).toBeTruthy();
  expect(screen.getByText('Provisional · B1')).toBeTruthy();
  expect(scoring.hook).toHaveBeenLastCalledWith('session');
  expect((screen.getByRole('button', { name: 'Can-Do' }) as HTMLButtonElement).disabled).toBe(true);
});
it('shows the final classification only when scoring and report status are complete', async () => {
  show({ ...base, hasScoredEvidence: true, scoringComplete: true, reportStatus: 'Completed' });
  expect(await screen.findByText('B1')).toBeTruthy();
  expect(screen.queryByText('This report is not final.')).toBeNull();
  expect((screen.getByRole('button', { name: 'Can-Do' }) as HTMLButtonElement).disabled).toBe(false);
  expect(scoring.hook).toHaveBeenLastCalledWith(null);
});

it('ignores a late response from the previous session when switching reports', async () => {
  let oldResponse!: (value: unknown) => void;
  vi.stubGlobal('fetch', vi.fn((url: string) => url.includes('/old/')
    ? new Promise(resolve => { oldResponse = resolve; })
    : Promise.resolve({ ok: true, json: async () => ({ ...base, candidateName: 'Current student' }) })));
  const view = render(<CandidateAdaptiveReport sessionId="old" />);
  view.rerender(<CandidateAdaptiveReport sessionId="new" />);
  expect(await screen.findByText('Current student — Adaptive Report')).toBeTruthy();
  oldResponse({ ok: true, json: async () => ({ ...base, candidateName: 'Previous student' }) });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(screen.queryByText('Previous student — Adaptive Report')).toBeNull();
  expect(screen.getByText('Current student — Adaptive Report')).toBeTruthy();
});
