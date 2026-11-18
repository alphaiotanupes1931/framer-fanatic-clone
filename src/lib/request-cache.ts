/** Coalesce concurrent readers and retain successful results for a short TTL. */
export function createRequestCache<T>(ttl: number) {
  const values = new Map<string, { value: T; expires: number }>();
  const pending = new Map<string, Promise<T>>();
  let generation = 0;
  return {
    read(key: string, fetcher: () => Promise<T>): Promise<T> {
      const hit = values.get(key);
      if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
      const running = pending.get(key);
      if (running) return running;
      const epoch = generation;
      const request = Promise.resolve().then(fetcher).then((value) => {
        if (epoch === generation) values.set(key, { value, expires: Date.now() + ttl });
        return value;
      }).finally(() => {
        if (pending.get(key) === request) pending.delete(key);
      });
      pending.set(key, request);
      return request;
    },
    clear() {
      generation += 1;
      values.clear();
      pending.clear();
    },
  };
}