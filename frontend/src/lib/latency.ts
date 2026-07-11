// Client-measured wall-clock around a fetch. The store below carries the most
// recent query's duration so the status bar (rendered far from the query
// components) can read it - same tiny-external-store shape as the theme pref.

// Shown as a hover title wherever a latency readout appears. This number is
// wall clock measured in the browser: network + server + any provider
// embedding. It is not a server-side timing.
export const LATENCY_TITLE =
  "Measured in the browser: full request round-trip including network and server time";

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
