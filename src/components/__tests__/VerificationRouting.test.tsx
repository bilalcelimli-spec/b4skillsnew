// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../../App';

vi.mock('../../hooks/useScoringStatus', () => ({ useScoringStatus: () => ({ state: 'complete' }) }));
const fetchMock = vi.fn();
function LocationProbe() { return <output data-testid="path">{useLocation().pathname}</output>; }
function open(path: string) {
  window.history.replaceState({}, '', path);
  return render(<MemoryRouter initialEntries={[path]}><App /><LocationProbe /></MemoryRouter>);
}
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () => url === '/api/auth/me' ? { user: null } : { valid: false, error: 'Certificate not found' },
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); fetchMock.mockReset(); window.history.replaceState({}, '', '/'); });

it.each(['/verify', '/verify/'])('opens the manual verification form at %s without a certificate ID', async path => {
  open(path);
  expect(screen.getByRole('heading', { name: 'Certificate Verification' })).toBeTruthy();
  expect(screen.getByLabelText('Certificate ID')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Certificate ID'), { target: { value: 'test-certificate' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
  expect(await screen.findByText('Certificate not found')).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledWith('/api/verify/test-certificate', expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

it.each(['/verify/test-certificate', '/verify?id=test-certificate'])('automatically verifies an ID at %s', async path => {
  open(path);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/verify/test-certificate', expect.objectContaining({ signal: expect.any(AbortSignal) })));
  expect(screen.getByLabelText('Certificate ID')).toHaveProperty('value', 'test-certificate');
});

it('keeps the public portal open when an authenticated admin session resolves', async () => {
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url === '/api/auth/me'
    ? { user: { uid: 'admin', role: 'SUPER_ADMIN', email: 'admin@example.test' } } : [] }));
  open('/verify');
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/candidates/admin/history', { credentials: 'include' }));
  expect(screen.getByTestId('path').textContent).toBe('/verify');
  expect(screen.getByRole('heading', { name: 'Certificate Verification' })).toBeTruthy();
});
