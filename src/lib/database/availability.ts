/** One probe at a time, shared by health checks and reconnect monitoring. */
export function createDatabaseProbe(query: () => Promise<unknown>, update: (available: boolean) => void) {
  let pending: Promise<boolean> | undefined;
  return function probe(): Promise<boolean> {
    if (pending) return pending;
    pending = Promise.resolve().then(query).then(
      () => { update(true); return true; },
      () => { update(false); return false; },
    ).finally(() => { pending = undefined; });
    return pending;
  };
}
