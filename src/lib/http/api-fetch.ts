/** Share refresh-token rotation between concurrent API requests. */
export function createAuthenticatedFetch(fetcher: typeof fetch, onSessionExpired: () => void): typeof fetch {
  let refreshing: Promise<boolean> | null = null;
  let redirected = false;
  return async (input, init) => {
    const api = typeof input === 'string' && input.startsWith('/api/');
    const options = api ? { ...init, credentials: 'include' as const } : init;
    const response = await fetcher(input, options);
    if (!api || response.status !== 401 || input.startsWith('/api/auth/')) return response;
    if (!refreshing) {
      refreshing = fetcher('/api/auth/refresh', { method: 'POST', credentials: 'include' })
        .then(result => result.ok, () => false)
        .finally(() => { refreshing = null; });
    }
    if (await refreshing) return fetcher(input, options);
    if (!redirected) { redirected = true; onSessionExpired(); }
    return response;
  };
}
