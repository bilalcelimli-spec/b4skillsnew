// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
const measurement = vi.hoisted(() => ({ analyticsChoice: vi.fn(() => null), disableMarketingMeasurement: vi.fn(), isPublicMarketingPath: vi.fn(() => true), measureMarketingPage: vi.fn(), setAnalyticsChoice: vi.fn() }));
vi.mock('../src/services/marketingMeasurement', () => measurement);
import { MarketingConsent } from '../src/components/MarketingConsent';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
test('private assessment state removes consent UI and disables measurement until public content returns', () => {
  const view = render(<MarketingConsent path="/" isTr={false} enabled />);
  expect(screen.getByRole('button', { name: 'Allow analytics' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Allow analytics' }));
  expect(measurement.setAnalyticsChoice).toHaveBeenCalledWith('accepted');
  view.rerender(<MarketingConsent path="/" isTr={false} enabled={false} />);
  expect(screen.queryByRole('button', { name: 'Cookie preferences' })).toBeNull();
  expect(measurement.disableMarketingMeasurement).toHaveBeenCalled();
  measurement.measureMarketingPage.mockClear();
  view.rerender(<MarketingConsent path="/" isTr={false} enabled />);
  expect(measurement.measureMarketingPage).toHaveBeenCalledWith('/');
  view.unmount();
  expect(measurement.disableMarketingMeasurement).toHaveBeenCalled();
});
