import { useState } from "react";
import type { QueryHit } from "../../api/types";
import { interpretScore } from "./scoring";
import { ScoreBar } from "./ScoreBar";
import { MetadataTable } from "./MetadataTable";

export function HitRow({
  hit, rank, metric, fraction, badge,
}: { hit: QueryHit; rank: number; metric: string; fraction: number; badge?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const score = interpretScore(hit.distance, metric);
  return (
    <li className="hit">
      <button type="button" className="hit-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="hit-rank">#{rank}</span>
        <ScoreBar fraction={fraction} betterIsHigher={score.betterIsHigher} />
        <span className="hit-score">{score.primary}</span>
        <span className="hit-id">{hit.id}</span>
        {badge}
        <span className="hit-snippet">{snippet(hit.document)}</span>
      </button>
      {open && (
        <div className="hit-body">
          <p className="hit-doc">{hit.document ?? "(no document)"}</p>
          <MetadataTable metadata={hit.metadata} />
        </div>
      )}
    </li>
  );
}

function snippet(doc: string | null): string {
  if (!doc) return "";
  return doc.length > 100 ? `${doc.slice(0, 100)}…` : doc;
}
