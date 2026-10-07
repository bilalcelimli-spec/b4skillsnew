// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ScoreValidityEvidencePanel } from '../admin/ScoreValidityEvidencePanel';
import { summarizeScoreValidity } from '../../lib/analytics/score-validity';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('renders missing evidence without fabricated zero accuracy or reliability',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>summarizeScoreValidity([])})));
  render(<ScoreValidityEvidencePanel/>);
  expect(await screen.findByRole('heading',{name:'Score Evidence'})).toBeTruthy();
  expect(screen.getAllByText('Not available').length).toBe(2);
  expect(screen.getByText('No scored evidence available.')).toBeTruthy();
  expect(screen.queryByText('0.0%')).toBeNull();
});
it('shows an API error with a working retry instead of treating it as evidence',async()=>{
  const fetchMock=vi.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true,json:async()=>summarizeScoreValidity([])});
  vi.stubGlobal('fetch',fetchMock);render(<ScoreValidityEvidencePanel/>);
  expect(await screen.findByRole('alert')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Retry'}));
  expect(await screen.findByRole('heading',{name:'Score Evidence'})).toBeTruthy();expect(fetchMock).toHaveBeenCalledTimes(2);
});
