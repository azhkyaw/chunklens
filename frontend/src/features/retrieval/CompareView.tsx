import type { QueryResult } from "../../api/types";
import { ResultsPanel } from "./ResultsPanel";
import { compareResults, type CompareRow } from "./compareResults";

export function CompareView({ a, b, metric }: { a: QueryResult; b: QueryResult; metric: string }) {
  const rows = compareResults(a.hits, b.hits);
  const annA = new Map<string, React.ReactNode>();
  const annB = new Map<string, React.ReactNode>();
  for (const r of rows) {
    if (r.membership === "onlyA") annA.set(r.id, <span className="tag-only"> · only A</span>);
    else if (r.membership === "onlyB") annB.set(r.id, <span className="tag-only"> · only B</span>);
    else {
      annA.set(r.id, <span className="tag-shared"> · ●</span>);   // shared marker on A
      annB.set(r.id, deltaBadge(r));                              // A->B rank movement, shown once (on B)
    }
  }
  return (
    <div className="compare-view">
      <div className="compare-col"><h4>Query A</h4><ResultsPanel hits={a.hits} metric={metric} annotations={annA} /></div>
      <div className="compare-col"><h4>Query B</h4><ResultsPanel hits={b.hits} metric={metric} annotations={annB} /></div>
    </div>
  );
}

function deltaBadge(row: CompareRow): React.ReactNode {
  if (row.delta == null || row.delta === 0) return <span className="tag-shared"> · ●</span>;
  const up = row.delta > 0; // delta = aRank - bRank; > 0 means a better (higher) rank in B
  return <span className={up ? "delta-up" : "delta-down"}> · {up ? "▲" : "▼"}{Math.abs(row.delta)}</span>;
}
