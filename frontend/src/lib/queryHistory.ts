import type { QuerySpec } from "../features/query/querySpec";

// Session-only query history: an in-memory per-collection ring of QuerySpec
// snapshots. Deliberately NOT persisted - saved queries are a separate
// roadmap feature and this must not preempt its design.
export interface HistoryEntry {
  spec: QuerySpec;
  label: string;
}

interface StoredEntry extends HistoryEntry {
  key: string; // JSON identity for move-to-front dedupe
}

const RING = 20;
const rings = new Map<string, StoredEntry[]>();

// Strip unique IDs from filter trees to create a stable key for comparison.
// Two specs with identical structure are "the same" even if their tree IDs differ.
function stripIds(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripIds);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k !== "id") result[k] = stripIds(v);
  }
  return result;
}

export function historyLabel(spec: QuerySpec): string {
  const base = spec.mode === "vector" ? "vector query" : spec.text.trim();
  const text = base.length > 48 ? `${base.slice(0, 47)}…` : base;
  return `${text} · n=${spec.nResults}`;
}

export function recordQuery(collection: string, spec: QuerySpec): void {
  const key = JSON.stringify(stripIds(spec));
  const ring = rings.get(collection) ?? [];
  const entry: StoredEntry = { key, label: historyLabel(spec), spec: structuredClone(spec) };
  rings.set(collection, [entry, ...ring.filter((e) => e.key !== key)].slice(0, RING));
}

export function getHistory(collection: string): HistoryEntry[] {
  // A fresh array of plain { spec, label } objects - never the ring itself
  // (a caller mutating it, e.g. .sort()/.push(), would corrupt the internal
  // ring state) and never the internal StoredEntry (whose `key` field is a
  // dedupe implementation detail, not part of the documented shape).
  return (rings.get(collection) ?? []).map(({ spec, label }) => ({ spec, label }));
}

// One-slot replay handoff: the palette requests, SingleQuery consumes - at
// mount (after navigation) or via the subscription (already mounted).
let pending: { collection: string; spec: QuerySpec } | null = null;
const replayListeners = new Set<() => void>();

export function requestReplay(collection: string, spec: QuerySpec): void {
  pending = { collection, spec: structuredClone(spec) };
  replayListeners.forEach((fn) => fn());
}

export function consumeReplay(collection: string): QuerySpec | null {
  if (pending?.collection !== collection) return null;
  const { spec } = pending;
  pending = null;
  return spec;
}

export function subscribeReplay(fn: () => void): () => void {
  replayListeners.add(fn);
  return () => {
    replayListeners.delete(fn);
  };
}

// Connection switches invalidate everything cached about the old server,
// including which queries make sense against it.
export function clearHistory(): void {
  rings.clear();
  pending = null;
}
