// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CheckoutPage } from '../CheckoutPage';
import { PreTestBriefing } from '../PreTestBriefing';
import { EARLY_START_ACKNOWLEDGEMENT, EARLY_START_REQUEST, PURCHASE_POLICY_VERSION } from '../../lib/payments/purchase-policy';
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('does not collect payment or legal consents when no web provider is active', () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  render(<CheckoutPage initialPlan="pro-bundle" />);
  expect(screen.getByRole('heading', { name: 'Satın alma bilgisi' })).toBeTruthy();
  expect(screen.getByText(/ücretli bireysel satın alma şu anda sunulmuyor/)).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByRole('button', { name: /ödemek/ })).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
it('requires separate explicit early-start acknowledgements and passes the recorded consent to launch', async () => {
  const start = vi.fn();
  const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('start-conditions')
    ? { conditions: { transactionId: 'order', policyVersion: PURCHASE_POLICY_VERSION, withdrawalEndsAt: '2026-11-18T00:00:00Z', requiresConsent: true, requestText: EARLY_START_REQUEST, acknowledgementText: EARLY_START_ACKNOWLEDGEMENT } }
    : { consentId: 'recorded-consent' } }));
  vi.stubGlobal('fetch', fetchMock);
  render(<PreTestBriefing checkPurchaseTerms onStart={start} onCancel={vi.fn()} />);
  await screen.findByText('14 gün dolmadan sınava başlama');
  const checks = screen.getAllByRole('checkbox') as HTMLInputElement[];
  expect(checks.map(c => c.checked)).toEqual([false, false]);
  const button = screen.getByRole('button', { name: /Start Test/ }) as HTMLButtonElement;
  fireEvent.click(checks[0]); expect(button.disabled).toBe(true);
  fireEvent.click(checks[1]);
  await waitFor(() => expect(button.disabled).toBe(false)); fireEvent.click(button);
  await waitFor(() => expect(start).toHaveBeenCalledWith('recorded-consent'));
  expect(JSON.parse((fetchMock.mock.calls.find(c => c[0].endsWith('/early-start')) as any)[1].body)).toEqual({ transactionId: 'order', policyVersion: PURCHASE_POLICY_VERSION, requestEarlyStart: true, acknowledgeWithdrawalEffect: true });
});
it('fails closed when the server cannot load purchase conditions', async () => {
  const start = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Geçici hata' }) })));
  render(<PreTestBriefing checkPurchaseTerms onStart={start} onCancel={vi.fn()} />);
  await screen.findByText('Geçici hata');
  fireEvent.click(screen.getByRole('button', { name: /Start Test/ })); expect(start).not.toHaveBeenCalled();
});
