// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ContentFactoryOpsPanel } from '../admin/ContentFactoryOpsPanel';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('shows held pilot items and their reasons separately from eligible candidates', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/promote') ? {
    candidates: [{ id: 'one', itemCode: 'G-1', skill: 'GRAMMAR', cefrLevel: 'B1' }],
    blocked: [{ id: 'held', itemCode: 'G-2', reasons: ['MODERATION_APPROVAL_MISSING', 'ITEM_SUSPENDED'] }],
  } : {} })));
  render(<ContentFactoryOpsPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Preview candidates' }));
  expect((await screen.findByText('1 item would be promoted')).textContent).toBeTruthy();
  expect(screen.getByText('G-2: MODERATION_APPROVAL_MISSING, ITEM_SUSPENDED')).toBeTruthy();
});
it('does not turn a failed preview into an empty successful result and allows retry', async () => {
  let fail = true;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: !url.includes('/promote') || !fail, json: async () =>
    url.includes('/promote') ? fail ? { error: 'Database required' } : { candidates: [], blocked: [] } : {} })));
  render(<ContentFactoryOpsPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Preview candidates' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Database required');
  expect(screen.queryByText('No eligible items for pilot promotion.')).toBeNull();
  fail = false; fireEvent.click(screen.getByRole('button', { name: 'Preview candidates' }));
  await screen.findByText('No eligible items for pilot promotion.');
  expect(screen.queryByRole('alert')).toBeNull();
});
