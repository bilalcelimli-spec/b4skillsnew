// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CandidateConsentGate, GuardianDecisionPage } from '../GuardianConsent';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });
const result = (data: unknown, ok = true) => ({ ok, json: async () => data });
it('blocks the exam on network failure and retries explicitly', async () => {
 const mock = vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(result({allowed:true,ageBand:'ADULT',status:'READY'})); vi.stubGlobal('fetch',mock);
 render(<CandidateConsentGate><button>Start assessment</button></CandidateConsentGate>);
 expect(screen.queryByText('Start assessment')).toBeNull(); await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Durumu yenile'})); await screen.findByText('Start assessment');
});
it('keeps the exam unavailable after guardian email confirmation until school verification', async () => {
 const mock = vi.fn().mockResolvedValue(result({allowed:false,ageBand:'UNDER_13',guardianRequired:true,status:'SCHOOL_VERIFICATION_REQUIRED'}));vi.stubGlobal('fetch',mock);
 render(<CandidateConsentGate><button>Start assessment</button></CandidateConsentGate>);
 await screen.findByText(/Veli e-posta onayı alındı/); expect(screen.queryByText('Start assessment')).toBeNull();
});
it('requires a separate explicit guardian declaration and sends the token in the POST body', async () => {
 const raw='a'.repeat(43); window.history.replaceState({}, '', `/guardian-consent#${raw}`);
 const mock=vi.fn().mockResolvedValue(result({approved:true,manageToken:'b'.repeat(43)}));vi.stubGlobal('fetch',mock);
 render(<GuardianDecisionPage/>);
 const approve=screen.getByRole('button',{name:'Onay ver'}) as HTMLButtonElement; expect(approve.disabled).toBe(true);
 fireEvent.change(screen.getByRole('textbox',{name:'Adınız ve soyadınız'}),{target:{value:'Synthetic Guardian'}});
 fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(approve);
 await screen.findByText(/E-posta onayınız kaydedildi/);
 expect(mock.mock.calls[0][0]).toBe('/api/guardian-consent/decision');
 expect(JSON.parse(mock.mock.calls[0][1].body)).toMatchObject({token:raw,acknowledged:true,approve:true});
 expect(screen.getByRole('link',{name:'Onayı yönet ve geri çek'}).getAttribute('href')).toContain('?manage=1#');
});
it('allows declining without providing any guardian identity', async () => {
 window.history.replaceState({}, '', '/guardian-consent#'+'a'.repeat(43));
 const mock=vi.fn().mockResolvedValue(result({approved:false}));vi.stubGlobal('fetch',mock);
 render(<GuardianDecisionPage/>);fireEvent.click(screen.getByRole('button',{name:'Onay vermiyorum'}));
 await waitFor(()=>expect(mock).toHaveBeenCalledOnce());
 expect(JSON.parse(mock.mock.calls[0][1].body)).toEqual({token:'a'.repeat(43),approve:false});
});
