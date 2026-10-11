/** Share refresh-token rotation between concurrent API requests. */
export function createAuthenticatedFetch(fetcher: typeof fetch, onSessionExpired: () => void): typeof fetch {
  let refreshing: Promise<'refreshed'|'expired'|'unavailable'> | null = null;
  let redirected = false;
  return async (input, init) => {
    const api = typeof input === 'string' && input.startsWith('/api/');
    const options = api ? { ...init, credentials: 'include' as const } : init;
    const response = await fetcher(input, options);
    if (!api || response.status !== 401 || input.startsWith('/api/auth/')) return response;
    if (!refreshing) {
      refreshing = fetcher('/api/auth/refresh', { method: 'POST', credentials: 'include', signal: AbortSignal.timeout(15000) })
        .then(result => result.ok ? 'refreshed' as const : result.status === 401 || result.status === 403 ? 'expired' as const : 'unavailable' as const, () => 'unavailable' as const)
        .finally(() => { refreshing = null; });
    }
    const outcome = await refreshing;
    if (outcome === 'refreshed') return fetcher(input, options);
    // A network outage or server error does not prove that the login expired.
    if (outcome === 'unavailable') return new Response(JSON.stringify({error:'Connection to your session could not be restored. Please check your connection and try again.'}), {status:503,headers:{'Content-Type':'application/json'}});
    if (!redirected) { redirected = true; onSessionExpired(); }
    return response;
  };
}
