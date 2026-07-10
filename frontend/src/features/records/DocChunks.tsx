import { useState } from "react";
import { useSourceRecords } from "../../api/hooks";

const PAGE = 25;

export function DocChunks({ name, sourceKey, value }: { name: string; sourceKey: string; value: string }) {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useSourceRecords(name, sourceKey, value, PAGE, offset);

  if (error) return <p role="alert">Failed to load chunks.</p>;
  // Covers both an in-flight fetch and a disabled query (TanStack v5 leaves
  // isLoading false and error null when a query is disabled and never fetched).
  if (isLoading || !data) return <p className="muted">Loading chunks…</p>;
  const page = data;

  return (
    <div className="doc-chunks">
      <div className="table-scroll">
        <table className="records-table">
          <thead><tr><th>ID</th><th>Document</th><th>Metadata</th></tr></thead>
          <tbody>
            {page.items.map((r) => (
              <tr key={r.id}>
                <td className="cell-id">{r.id}</td>
                <td className="cell-doc">{r.document}</td>
                <td className="cell-meta"><code>{JSON.stringify(r.metadata)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {page.total > PAGE && (
        <div className="pager">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Prev</button>
          <span className="pager-status">{offset + 1}–{Math.min(offset + PAGE, page.total)} of {page.total}</span>
          <button disabled={offset + PAGE >= page.total} onClick={() => setOffset(offset + PAGE)}>Next</button>
        </div>
      )}
    </div>
  );
}
