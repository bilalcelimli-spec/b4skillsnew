// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeleteAccountDialog } from '../src/components/DeleteAccountDialog';
import { ACCOUNT_DELETION_CONFIRMATION } from '../src/lib/compliance/account-deletion';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const reply = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('DeleteAccountDialog', () => {
  it('needs the checkbox, sends the server confirmation token and reports success', async () => {
    const fetchMock = reply(200, { deleted: true }); vi.stubGlobal('fetch', fetchMock);
    const onDeleted = vi.fn();
    render(<DeleteAccountDialog onClose={() => {}} onDeleted={onDeleted} />);
    const submit = screen.getByRole('button', { name: /Kalıcı olarak sil/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Parola/), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(submit);
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as any;
    expect(url).toBe('/api/auth/delete-account');
    expect(JSON.parse(init.body)).toEqual({ confirm: ACCOUNT_DELETION_CONFIRMATION, password: 'pw' });
  });

  it('shows the server reason and stays open on a wrong password', async () => {
    vi.stubGlobal('fetch', reply(403, { code: 'invalid_password' }));
    const onDeleted = vi.fn();
    render(<DeleteAccountDialog onClose={() => {}} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Kalıcı olarak sil/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Parola yanlış');
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
