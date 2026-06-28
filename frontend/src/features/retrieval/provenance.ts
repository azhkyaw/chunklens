import type { QueryHit } from "../../api/types";

export const PROVENANCE_KEYS = ["source", "path", "url", "page", "doc_id", "title"] as const;

export function isProvenanceKey(key: string): boolean {
  return (PROVENANCE_KEYS as readonly string[]).includes(key.toLowerCase());
}

export interface SourceGroup {
  key: string;
  value: string;
  hits: QueryHit[];
}

export function groupBySource(hits: QueryHit[], key: string): SourceGroup[] {
  const order: string[] = [];
  const byValue = new Map<string, QueryHit[]>();
  for (const hit of hits) {
    const raw = hit.metadata?.[key];
    const value = raw === undefined || raw === null ? "(none)" : String(raw);
    if (!byValue.has(value)) {
      byValue.set(value, []);
      order.push(value);
    }
    byValue.get(value)!.push(hit);
  }
  return order.map((value) => ({ key, value, hits: byValue.get(value)! }));
}
