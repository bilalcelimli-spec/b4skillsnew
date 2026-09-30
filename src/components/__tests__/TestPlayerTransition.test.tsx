// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TestPlayer } from '../TestPlayer';

vi.mock('../../lib/i18n/config', () => ({}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../ProctoringMonitor', () => ({ ProctoringMonitor: () => null }));
vi.mock('../LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));
vi.mock('../FaceCapture', () => ({ FaceCapture: ({ onCaptureDone }: any) => <button onClick={onCaptureDone}>Verify</button> }));
vi.mock('../PracticeMode', () => ({ PracticeMode: ({ onComplete }: any) => <button onClick={onComplete}>Finish practice</button> }));
vi.mock('../CandidateFeedback', () => ({ CandidateFeedback: () => null }));
vi.mock('../ItemRenderer', () => ({ ItemRenderer: ({ item, onResponse, disabled }: any) =>
  <section><h2>{item.id}</h2><button disabled={disabled} onClick={() => onResponse('A')}>Confirm Answer</button></section> }));
// Keep the actual animation library: pausing frames must not pause task delivery.
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('replaces the loading screen with listening question two even when animation frames never run', async () => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  let resolveNext!: (value: unknown) => void;
  const delayedNext = new Promise(resolve => { resolveNext = resolve; });
  let answered = false;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('/launch')) return { ok: true, json: async () => ({ sessionId: 'exam-cuid' }) };
    if (url.endsWith('/status')) return { ok: true, json: async () => ({ progress: answered ? 1 : 0 }) };
    if (url.endsWith('/respond')) { answered = true; return { ok: true, json: async () => ({ success: true }) }; }
    if (answered) return delayedNext;
    return { ok: true, json: async () => ({ currentSection: 'LISTENING', item: { id: 'Listening question one', skill: 'LISTENING' } }) };
  }));
  render(<TestPlayer organizationId="org" candidateId="candidate" onComplete={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Verify' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Finish practice' }));
  expect(await screen.findByRole('heading', { name: 'Listening question one' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Answer' }));
  expect(await screen.findByText('Selecting Next Task')).toBeTruthy();
  await act(async () => {
    resolveNext({ ok: true, json: async () => ({ currentSection: 'LISTENING', item: { id: 'Listening question two', skill: 'LISTENING' } }) });
  });
  expect(screen.queryByText('Selecting Next Task')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Listening question two' })).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Confirm Answer' }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByTestId('assessment-task-panel').getAttribute('aria-busy')).toBe('false');
});
