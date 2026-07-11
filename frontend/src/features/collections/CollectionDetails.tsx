import { useState } from "react";
import { useCollectionDetails } from "../../api/hooks";
import { copyText } from "../../lib/copy";
import { Skeleton } from "../../ui/Skeleton";

export function CollectionDetails({ name }: { name: string }) {
  const { data } = useCollectionDetails(name);
  const [raw, setRaw] = useState(false);

  if (!data) return <Skeleton label="Loading collection details" rows={1} className="skeleton-plate" />;

  const json = JSON.stringify(data, null, 2);
  return (
    <section className="details">
      <dl className="spec-plate">
        <div className="spec"><dt>Records</dt><dd>{data.count}</dd></div>
        <div className="spec"><dt>Dimensions</dt><dd>{data.dimensionality ?? "-"}</dd></div>
        <div className="spec"><dt>Metric</dt><dd>{data.distance_metric}</dd></div>
        <div className="spec"><dt>Embedding fn</dt><dd>{data.embedding_function}</dd></div>
      </dl>
      <div className="details-actions">
        <button type="button" className="btn-sm" aria-pressed={raw} onClick={() => setRaw((r) => !r)}>
          Raw JSON
        </button>
        {raw && (
          <button type="button" className="btn-sm" onClick={() => copyText(json, "JSON")}>
            Copy JSON
          </button>
        )}
      </div>
      {raw && <pre className="inspector-raw" data-testid="details-raw">{json}</pre>}
    </section>
  );
}
