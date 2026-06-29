import type { CollectionDetails } from "../../api/types";

export function QueryContextStrip({ details }: { details?: CollectionDetails }) {
  if (!details) return null;
  return (
    <p className="context-strip">
      EF: <strong>{details.embedding_function}</strong> · dim: {details.dimensionality ?? "-"} · metric: {details.distance_metric}
    </p>
  );
}
