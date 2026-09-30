/** A stalled connection must not leave the candidate on an endless task spinner. */
export async function requestNextItem(sessionId: string, timeoutMs = 20000): Promise<any> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/next`, {
      credentials: 'include', signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok || data?.error) throw new Error(data?.error || 'Failed to fetch next item.');
    if (!data || typeof data !== 'object' || (!data.stop && !data.sectionTransition && !data.item?.id))
      throw new Error('The next task could not be loaded. Please reconnect.');
    return data;
  } catch (error) {
    if (timedOut) throw new Error('Loading the next task timed out. Your saved answer is safe. Please reconnect.');
    throw error;
  } finally { clearTimeout(timer); }
}
