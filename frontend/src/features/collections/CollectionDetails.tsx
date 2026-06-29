import { useCollectionDetails } from "../../api/hooks";

export function CollectionDetails({ name }: { name: string }) {
  const { data } = useCollectionDetails(name);

  if (!data) return <p className="muted">Loading details…</p>;

  return (
    <section className="details">
      <dl className="spec-plate">
        <div className="spec"><dt>Records</dt><dd>{data.count}</dd></div>
        <div className="spec"><dt>Dimensions</dt><dd>{data.dimensionality ?? "-"}</dd></div>
        <div className="spec"><dt>Metric</dt><dd>{data.distance_metric}</dd></div>
        <div className="spec"><dt>Embedding fn</dt><dd>{data.embedding_function}</dd></div>
      </dl>
    </section>
  );
}
