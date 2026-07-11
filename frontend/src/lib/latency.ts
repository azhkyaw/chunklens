// Client-measured wall-clock around a fetch. The store below carries the most
// recent query's duration so the status bar (rendered far from the query
// components) can read it - same tiny-external-store shape as the theme pref.
export async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t0 = performance.now();
  const result = await fn();
  return { result, ms: Math.round(performance.now() - t0) };
}

let lastMs: number | null = null;
const listeners = new Set<() => void>();

export function setLastLatency(ms: number | null): void {
  lastMs = ms;
  listeners.forEach((fn) => fn());
}

export function getLastLatency(): number | null {
  return lastMs;
}

export function subscribeLatency(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
