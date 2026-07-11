import { useState } from "react";
import type { QueryHit } from "../../api/types";
import { useSelection } from "../../lib/selection";
import { interpretScore, barFractions } from "./scoring";
import { groupBySource } from "./provenance";
import { HitRow } from "./HitRow";

export function ResultsPanel({
  hits, metric, keys = [], annotations, side, deltas,
}: {
  hits: QueryHit[];
  metric: string;
  keys?: string[];
  annotations?: Map<string, React.ReactNode>;
  side?: "A" | "B";
  deltas?: Map<string, number | null>;
}) {
  const [groupKey, setGroupKey] = useState("");
  const { selection, select } = useSelection();
  if (hits.length === 0) return <p className="muted results-empty">0 hits · nothing matched. Try broadening the query or relaxing filters.</p>;

  const label = interpretScore(hits[0].distance, metric).label;
  const fractions = barFractions(hits.map((h) => h.distance), metric);
  const rankOf = new Map(hits.map((h, i) => [h.id, i + 1]));
  const fractionOf = new Map(hits.map((h, i) => [h.id, fractions[i]]));

  const row = (h: QueryHit) => {
    const rank = rankOf.get(h.id)!;
    const isSelected =
      selection?.kind === "hit" && selection.hit.id === h.id && selection.side === side;
    return (
      <HitRow key={h.id} hit={h} rank={rank} metric={metric}
              fraction={fractionOf.get(h.id)!} badge={annotations?.get(h.id)}
              selected={isSelected}
              onSelect={() =>
                select({ kind: "hit", hit: h, rank, metric, side, delta: deltas?.get(h.id) ?? null })
              } />
    );
  };

  const listLabel = side ? `Results ${side}` : "Results";
  return (
    <div className="results">
      <div className="results-head">
        <span className="results-count">{hits.length} hits · {label}</span>
        {keys.length > 0 && (
          <label className="results-groupby">group by{" "}
            <select value={groupKey} onChange={(e) => setGroupKey(e.target.value)}>
              <option value="">(none)</option>
              {keys.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        )}
      </div>
      {groupKey === "" ? (
        <ol className="hit-list" role="listbox" aria-label={listLabel}>{hits.map(row)}</ol>
      ) : (
        groupBySource(hits, groupKey).map((g) => (
          <section key={g.value} className="hit-group">
            <h4 className="hit-group-title">{g.key}: {g.value} ({g.hits.length})</h4>
            <ol className="hit-list" role="listbox" aria-label={`${listLabel} · ${g.key}: ${g.value}`}>{g.hits.map(row)}</ol>
          </section>
        ))
      )}
    </div>
  );
}
