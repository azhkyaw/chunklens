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
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
              style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", textAlign: "left" }}>
        <span>#{rank}</span>
        <ScoreBar fraction={fraction} betterIsHigher={score.betterIsHigher} />
        <span>{score.primary}</span>
        <span>{hit.id}</span>
        {badge}
        <span style={{ color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{snippet(hit.document)}</span>
      </button>
      {open && (
        <div>
          <p>{hit.document ?? "(no document)"}</p>
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
