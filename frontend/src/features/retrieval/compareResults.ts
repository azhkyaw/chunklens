import type { QueryHit } from "../../api/types";

export interface CompareSide { rank: number; distance: number; }
export interface CompareRow {
  id: string;
  a: CompareSide | null;
  b: CompareSide | null;
  delta: number | null;
  membership: "shared" | "onlyA" | "onlyB";
}

export function compareResults(aHits: QueryHit[], bHits: QueryHit[]): CompareRow[] {
  const side = (hits: QueryHit[]) => new Map(hits.map((h, i) => [h.id, { rank: i + 1, distance: h.distance }]));
  const aMap = side(aHits);
  const bMap = side(bHits);
  const ids = [...new Set([...aMap.keys(), ...bMap.keys()])]; // union, A-first insertion order
  const rows: CompareRow[] = ids.map((id) => {
    const a = aMap.get(id) ?? null;
    const b = bMap.get(id) ?? null;
    const membership: CompareRow["membership"] = a && b ? "shared" : a ? "onlyA" : "onlyB";
    const delta = a && b ? a.rank - b.rank : null;
    return { id, a, b, delta, membership };
  });
  return stableSortByBestRank(rows);
}

function stableSortByBestRank(rows: CompareRow[]): CompareRow[] {
  return rows
    .map((row, i) => ({ row, i, best: Math.min(...[row.a?.rank, row.b?.rank].filter((r): r is number => r != null)) }))
    .sort((x, y) => x.best - y.best || x.i - y.i)
    .map((w) => w.row);
}
