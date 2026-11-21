// @vitest-environment jsdom
/**
 * Public pages are server-rendered (entry-server.tsx) and hydrated in place
 * (main.tsx). They must render before the session check ends, and the first
 * browser render must match the server HTML, or React replaces it (flash,
 * worse LCP, layout shift).
 */
import React, { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import { render as renderOnServer, SSR_RENDERED_PATHS } from '../src/entry-server';
import { DomProviders } from '../src/public-pages';
import { preloadPublicPage } from '../src/public-pages-lazy';

const pending = () => new Promise<Response>(() => {});
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
const app = (path: string) => <MemoryRouter initialEntries={[path]}><DomProviders><App /></DomProviders></MemoryRouter>;
// The full-screen spinner of App's session gate and of PageLoader.
const spinner = (root: ParentNode) => root.querySelector('.min-h-screen > .animate-spin.h-12');
const serverHeading = (path: string) => {
  const box = document.createElement('div');
  box.innerHTML = renderOnServer(path).html;
  return box.querySelector('h1')?.textContent;
};

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  window.scrollTo = vi.fn() as never;
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  consoleError.mockRestore();
});

describe('public pages render while the session check is still running', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(pending)));

  it.each(['/pricing', '/cefr-levels/b2', '/schools', '/english-level-test', '/'])('%s shows its heading, not the spinner', async path => {
    const { container } = render(app(path));
    const h1 = await screen.findByRole('heading', { level: 1 });
    expect(h1.textContent).toBe(serverHeading(path));
    expect(spinner(container)).toBeNull();
  });

  it('/cefr-levels/b2 is the B2 guide', async () => {
    render(app('/cefr-levels/b2'));
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toMatch(/B2/);
  });

  it('a protected route still waits for the session check', async () => {
    const { container } = render(app('/dashboard'));
    await waitFor(() => expect(spinner(container)).not.toBeNull());
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });
});

describe('once the session check finds a signed-in user', () => {
  const user = { uid: 'u1', email: 'a@example.com', role: 'CANDIDATE', organizationId: null };
  beforeEach(() => vi.stubGlobal('fetch', vi.fn((url: string) =>
    url.startsWith('/api/auth/session') ? json({ user }) : url.includes('/history') ? json([]) : pending())));

  it('a signed-out-only page (/schools) gives way to the app', async () => {
    const { container } = render(app('/schools'));
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(serverHeading('/schools'));
    await waitFor(() => expect(container.querySelector('h1')?.textContent).not.toBe(serverHeading('/schools')));
  });

  it('a page for everyone (/pricing) stays', async () => {
    render(app('/pricing'));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/candidates/u1/history', expect.anything()));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(serverHeading('/pricing'));
  });
});

describe('the browser hydrates the server HTML without changing it', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(pending)));

  it.each(SSR_RENDERED_PATHS.map(path => [path]))('%s', async path => {
    const { html, didSSR } = renderOnServer(path);
    expect(didSSR).toBe(true);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    const serverH1 = container.querySelector('h1');
    expect(serverH1).not.toBeNull();

    await preloadPublicPage(path);
    const recoverable: unknown[] = [];
    let root: Root | undefined;
    await act(async () => { root = hydrateRoot(container, app(path), { onRecoverableError: error => recoverable.push(error) }); });

    expect(recoverable).toEqual([]);
    const hydrationLogs = consoleError.mock.calls.map(args => String(args[0])).filter(message => /hydrat|did not match|server rendered/i.test(message));
    expect(hydrationLogs).toEqual([]);
    // The server's heading node is kept, not re-created.
    expect(container.querySelector('h1')).toBe(serverH1);
    expect(spinner(container)).toBeNull();
    act(() => root!.unmount());
    container.remove();
  });
});
