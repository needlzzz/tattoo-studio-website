/**
 * Async mutex for serializing JSON file writes.
 * Usage:
 *   const release = await mutex.acquire();
 *   try { ... } finally { release(); }
 */
export function createMutex() {
  let queue = Promise.resolve();
  return {
    acquire() {
      let resolve;
      const next = new Promise((r) => (resolve = r));
      const current = queue.then(() => resolve);
      queue = queue.then(() => next);
      return current;
    },
  };
}
