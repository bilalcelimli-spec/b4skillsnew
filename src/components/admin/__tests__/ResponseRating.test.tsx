// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ResponseRating, ResponseScore, SpeakingPlayback } from '../ParticipantAnalysisPanel';
afterEach(cleanup);
it('shows a low final writing score as scored, without an incorrect icon', () => {
 const response = {item: {skill: 'WRITING'}, score: 0.17, aiScore: 0.17, isCorrect: false, scoringStatus: 'scored' as const};
 render(<><ResponseRating response={response}/><ResponseScore response={response}/></>);
 expect(screen.getByText('Scored')).toBeTruthy();
 expect(screen.queryByLabelText('Incorrect')).toBeNull();
 expect(screen.getByText('Final: 0.17')).toBeTruthy();
});
it('labels zero AI proposal as provisional and withholds a stale final score during review', () => {
 const response = {item: {skill: 'SPEAKING'}, score: 0.8, aiScore: 0, isCorrect: null, scoringStatus: 'review_required' as const};
 render(<><ResponseRating response={response}/><ResponseScore response={response}/></>);
 expect(screen.getByText('Human review required')).toBeTruthy();
 expect(screen.getByText('AI proposal: 0.00')).toBeTruthy();
 expect(screen.getByText('Final: pending')).toBeTruthy();
 expect(screen.queryByText('Final: 0.80')).toBeNull();
});
it('keeps correctness icons for scored objective items', () => {
 render(<ResponseRating response={{item: {skill: 'READING'}, score: 0, isCorrect: false}}/>);
 expect(screen.getByLabelText('Incorrect')).toBeTruthy();
});
it('plays embedded audio on demand without displaying answer JSON', () => {
 const value = JSON.stringify({audio:'YWJj',mimeType:'audio/webm;codecs=opus'});
 render(<SpeakingPlayback value={value}/>);
 const audio = screen.getByLabelText('Speaking recording');
 expect(audio.getAttribute('preload')).toBe('none');
 expect(audio.hasAttribute('controls')).toBe(true);
 expect(screen.queryByText(value)).toBeNull();
});
it('renders a missing recording state for malformed or unsupported audio', () => {
 render(<SpeakingPlayback value="invalid"/>);
 expect(screen.getByText('Recording unavailable')).toBeTruthy();
 expect(screen.queryByLabelText('Speaking recording')).toBeNull();
});
