import type { QueryHit } from "../../api/types";
import { interpretScore } from "./scoring";
import { ScoreBar } from "./ScoreBar";

// A hit is a selection, not an accordion: clicking feeds the inspector.
export function HitRow({
  hit, rank, metric, fraction, badge, selected, onSelect,
}: {
  hit: QueryHit;
  rank: number;
  metric: string;
  fraction: number;
  badge?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  const score = interpretScore(hit.distance, metric);
  return (
    <li className="hit" role="option" aria-selected={selected}>
      <button type="button" className="hit-head" onClick={onSelect}>
        <span className="hit-rank">#{rank}</span>
        <ScoreBar fraction={fraction} betterIsHigher={score.betterIsHigher} />
        <span className="hit-score">{score.primary}</span>
        <span className="hit-id">{hit.id}</span>
        {badge}
        <span className="hit-snippet">{snippet(hit.document)}</span>
      </button>
    </li>
  );
}

function snippet(doc: string | null): string {
  if (!doc) return "";
  return doc.length > 100 ? `${doc.slice(0, 100)}…` : doc;
}
