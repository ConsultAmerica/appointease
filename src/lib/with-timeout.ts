/**
 * Rejects if `promise` does not settle within `ms`. Use to avoid Route Handlers
 * hanging indefinitely when Postgres is unreachable or the TCP connect stalls.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = "timed out"): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(id);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}
