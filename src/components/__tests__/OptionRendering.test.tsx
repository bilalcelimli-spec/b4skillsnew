// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MultipleChoiceOptions } from '../MultipleChoiceOptions';
import { QuestionDrawer } from '../admin/ParticipantAnalysisPanel';
import { ItemGeneratorPanel } from '../admin/ItemGeneratorPanel';
import { MobileAssessment } from '../MobileAssessment';

vi.mock('../../hooks/useToast.js', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
afterEach(() => {
  cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks();
  if (originalScrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView);
  else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

const options = [
  { id: 'choice-one', text: 'First option', isCorrect: false, rationale: 'First rationale' },
  { id: 'choice-two', text: 'Second option', isCorrect: true, rationale: 'Second rationale' },
];

it('renders structured and legacy options with accessible text and positional selection', () => {
  const onSelect = vi.fn();
  render(<MultipleChoiceOptions options={[...options, 'Legacy option']} selected={1} onSelect={onSelect} />);
  const second = screen.getByRole('radio', { name: 'Option B: Second option' });
  expect(second.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(second);
  expect(onSelect).toHaveBeenCalledWith(1);
  expect(screen.getByText('Legacy option')).toBeTruthy();
  expect(screen.queryByText('Second rationale')).toBeNull();
});

it('renders the analysis drawer and matches structured IDs without selecting unanswered options', () => {
  const response: React.ComponentProps<typeof QuestionDrawer>['response'] = {
    id: 'response', order: 1, value: null, isCorrect: null, score: null,
    aiScore: null, humanScore: null, latencyMs: 1000, rtZScore: null, rtFlag: null,
    item: { id: 'item', itemCode: null, type: 'MULTIPLE_CHOICE', skill: 'READING',
      cefrLevel: 'B1', difficulty: 0, discrimination: 1, guessing: 0.25,
      content: { prompt: 'Choose an answer', options, correctAnswer: 'choice-two' } },
  };
  render(<QuestionDrawer response={response} onClose={vi.fn()} />);
  expect(screen.getByText('Second option').parentElement.className).toContain('bg-emerald-50');
  expect(screen.getByText('First option').parentElement.className).toContain('bg-slate-50');
});

it('renders structured options returned by item generation', async () => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({
    items: [{ type: 'MULTIPLE_CHOICE', skill: 'READING', cefrLevel: 'B1', question: 'Choose an answer',
      options, correctAnswer: 'choice-two', irtParams: { a: 1, b: 0, c: 0.25 },
      qualityReport: { qualityScore: 90, status: 'APPROVED', criticalCount: 0, majorCount: 0, minorCount: 0, issues: [], summary: 'Ready' },
      readabilityScore: 50, revisionHistory: [], totalGenerationPasses: 1 }],
    generationModel: 'test', approvedCount: 1, reviewCount: 0, rejectedCount: 0,
  }) })));
  render(<ItemGeneratorPanel />);
  fireEvent.click(screen.getByRole('button', { name: /Generate 1 Item/ }));
  const second = await screen.findByText('Second option');
  expect(second.parentElement.className).toContain('bg-emerald-50');
});

it('renders structured options fetched by the mobile player', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ item: {
    id: 'item', type: 'MULTIPLE_CHOICE', skill: 'READING', cefrLevel: 'B1',
    content: { prompt: 'Choose an answer', options },
  } }) })));
  render(<MobileAssessment sessionId="session" onComplete={vi.fn()} />);
  const second = await screen.findByRole('button', { name: /Second option/ });
  fireEvent.click(second);
  expect(second.getAttribute('aria-pressed')).toBe('true');
});
