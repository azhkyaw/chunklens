import { useEffect, useRef } from "react";
import type { QueryResult } from "../../api/types";
import { useSelection } from "../../lib/selection";
import { focusSelected, nextIndex } from "../../lib/selectionMove";
import { useShortcut } from "../../lib/shortcuts";
import { ResultsPanel } from "./ResultsPanel";
import { compareResults, type CompareRow } from "./compareResults";

export function CompareView({ a, b, metric, aMs, bMs }: {
  a: QueryResult; b: QueryResult; metric: string; aMs?: number; bMs?: number;
}) {
  const { selection, select } = useSelection();
  const rows = compareResults(a.hits, b.hits);
  const colARef = useRef<HTMLDivElement>(null);
  const colBRef = useRef<HTMLDivElement>(null);
  // Set only by a j/k move (never a click - the browser already focuses a
  // clicked hit natively) so the effect below knows when to steal focus.
  const focusPending = useRef(false);
  const annA = new Map<string, React.ReactNode>();
  const annB = new Map<string, React.ReactNode>();
  const deltas = new Map<string, number | null>();
  for (const r of rows) {
    if (r.membership === "onlyA") annA.set(r.id, <span className="tag-only"> · only A</span>);
    else if (r.membership === "onlyB") annB.set(r.id, <span className="tag-only"> · only B</span>);
    else {
      deltas.set(r.id, r.delta ?? null);
      annA.set(r.id, <span className="tag-shared"> · ●</span>);   // shared marker on A
      annB.set(r.id, deltaBadge(r));                              // A->B rank movement, shown once (on B)
    }
  }

  useShortcut("j", () => moveHit(1));
  useShortcut("k", () => moveHit(-1));

  // j/k move the selection state, but Enter is handled by whichever element
  // holds DOM focus. Without moving focus too, the still-focused hit button
  // from the last click re-fires its click on Enter and the selection snaps
  // back. Runs after render so the newly selected hit's button already exists.
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    if (selection?.kind !== "hit") return;
    const container = selection.side === "B" ? colBRef.current : colARef.current;
    focusSelected(container, selection.hit.id);
  }, [selection]);

  function moveHit(delta: number) {
    const side = selection?.kind === "hit" && selection.side ? selection.side : "A";
    const hits = side === "A" ? a.hits : b.hits;
    if (hits.length === 0) return;
    const cur =
      selection?.kind === "hit" && selection.side === side
        ? hits.findIndex((h) => h.id === selection.hit.id)
        : -1;
    const next = nextIndex(hits.length, cur, delta);
    if (next === cur) return;
    focusPending.current = true;
    select({
      kind: "hit",
      hit: hits[next],
      rank: next + 1,
      metric,
      side,
      delta: deltas.get(hits[next].id) ?? null,
    });
  }

  return (
    <div className="compare-view">
      <div className="compare-col" ref={colARef}><h4>Query A</h4><ResultsPanel hits={a.hits} metric={metric} annotations={annA} side="A" deltas={deltas} latencyMs={aMs} /></div>
      <div className="compare-col" ref={colBRef}><h4>Query B</h4><ResultsPanel hits={b.hits} metric={metric} annotations={annB} side="B" deltas={deltas} latencyMs={bMs} /></div>
    </div>
  );
}

function deltaBadge(row: CompareRow): React.ReactNode {
  if (row.delta == null || row.delta === 0) return <span className="tag-shared"> · ●</span>;
  const up = row.delta > 0; // delta = aRank - bRank; > 0 means a better (higher) rank in B
  return <span className={up ? "delta-up" : "delta-down"}> · {up ? "▲" : "▼"}{Math.abs(row.delta)}</span>;
}
