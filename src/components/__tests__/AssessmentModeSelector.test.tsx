// @vitest-environment jsdom
import React from 'react';
import {cleanup, render, screen, within} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {AssessmentModeSelector} from '../AssessmentModeSelector';
import {PRODUCT_LINE_PROFILES} from '../../lib/product-lines/profiles';
import {OZGUN_PRODUCT} from '../../lib/fixed-forms/ozgun-kids';
afterEach(cleanup);
it('shows the actual Express duration and all six sections without a duplicate progress exam',()=>{
 render(<AssessmentModeSelector onSelect={vi.fn()}/>);
 const card=screen.getByRole('button',{name:/Standard Placement/});
 expect(within(card).getByText('30–46 min')).toBeTruthy();
 for(const name of ['Grammar','Vocabulary','Reading','Listening','Writing','Speaking'])expect(within(card).getByText(name)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Progress Check/})).toBeNull();
 expect(screen.getByRole('button',{name:/Academic English/}).textContent).toContain('90–120 min');
});
it.each([...Object.keys(PRODUCT_LINE_PROFILES),OZGUN_PRODUCT,'General','Primary','Junior'])('opens only the assessment assigned by a %s code',product=>{
 const onSelect=vi.fn();
 render(<AssessmentModeSelector onSelect={onSelect} allowedProductLine={product}/>);
 expect(onSelect).toHaveBeenCalledExactlyOnceWith(({General:'General English',Primary:'Primary (7-10)',Junior:'Junior Suite (11-14)'} as Record<string,string>)[product] ?? product);
 expect(screen.queryAllByTestId('test-card')).toHaveLength(0);
});
it('blocks unknown assigned products instead of offering unrelated exams',()=>{
 const onSelect=vi.fn();
 render(<AssessmentModeSelector onSelect={onSelect} allowedProductLine="Unknown exam"/>);
 expect(screen.getByRole('alert')).toBeTruthy();
 expect(screen.queryAllByTestId('test-card')).toHaveLength(0);
 expect(onSelect).not.toHaveBeenCalled();
});
it('handles a changed assigned product once without repeating the same start',()=>{
 const onSelect=vi.fn();
 const {rerender}=render(<AssessmentModeSelector onSelect={onSelect} allowedProductLine="Corporate"/>);
 rerender(<AssessmentModeSelector onSelect={onSelect} allowedProductLine="Corporate"/>);
 expect(onSelect).toHaveBeenCalledTimes(1);
 rerender(<AssessmentModeSelector onSelect={onSelect} allowedProductLine="Academia"/>);
 expect(onSelect).toHaveBeenCalledTimes(2);
 expect(onSelect).toHaveBeenLastCalledWith('Academia');
});
