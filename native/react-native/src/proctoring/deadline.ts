/** OS permission/storage callbacks may remain pending; keep the preparation screen recoverable. */
export async function preparationDeadline<T>(work: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); })]);
  } finally { if (timer) clearTimeout(timer); }
}
