// @vitest-environment jsdom
import React from 'react';
import {afterEach, expect, it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {NextLevelGap} from '../NextLevelGap';
afterEach(cleanup);
it('never invents skill targets from an overall ability alone',()=>{
 render(<NextLevelGap skillScores={{}} overallTheta={2}/>);
 expect(screen.getByText(/No measured skill estimates/)).toBeTruthy();
 expect(screen.queryByText('Reading')).toBeNull();
});
it('uses the next band lower boundary and the supplied uncertainty',()=>{
 render(<NextLevelGap skillScores={{reading:{theta:0,sem:.4}}} overallTheta={0}/>);
 expect(screen.getByText('B1 → B2')).toBeTruthy();
 expect(screen.getByText('0.50 θ to next band')).toBeTruthy();
 expect(screen.getByText(/interval overlaps the target boundary/)).toBeTruthy();
 expect(screen.queryByText(/\d+%$/)).toBeNull();
});
it('does not mask weaker measured skills when the overall estimate is C2',()=>{
 render(<NextLevelGap skillScores={{reading:{theta:3,sem:.2},listening:{theta:0,sem:.1}}} overallTheta={3}/>);
 expect(screen.getByText('Listening')).toBeTruthy();
 expect(screen.getByText('B1 → B2')).toBeTruthy();
 expect(screen.queryByText(/interval overlaps/)).toBeNull();
 expect(screen.queryByText(/You have reached C2/)).toBeNull();
});
it('does not compute targets with missing or invalid uncertainty',()=>{
 render(<NextLevelGap skillScores={{reading:{theta:NaN,sem:.2},listening:{theta:0,sem:-1}}} overallTheta={0}/>);
 expect(screen.getByText(/No measured skill estimates/)).toBeTruthy();
});
it('handles the C1 to C2 boundary without inventing a higher target for C2 skills',()=>{
 render(<NextLevelGap skillScores={{reading:{theta:2,sem:.1},speaking:{theta:3,sem:.1}}} overallTheta={2}/>);
 expect(screen.getByText('C1 → C2')).toBeTruthy();
 expect(screen.getByText('0.50 θ to next band')).toBeTruthy();
 expect(screen.queryByText('Speaking')).toBeNull();
});
