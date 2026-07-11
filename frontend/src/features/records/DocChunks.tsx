import { useState } from "react";
import { useSourceRecords } from "../../api/hooks";
import type { RecordRow } from "../../api/types";
import { useSelection } from "../../lib/selection";
import { Skeleton } from "../../ui/Skeleton";

const PAGE = 25;

export function DocChunks({ name, sourceKey, value }: { name: string; sourceKey: string; value: string }) {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useSourceRecords(name, sourceKey, value, PAGE, offset);
  const { selection, select } = useSelection();

  if (error) return <p role="alert">Failed to load chunks.</p>;
  // Covers both an in-flight fetch and a disabled query (TanStack v5 leaves
  // isLoading false and error null when a query is disabled and never fetched).
  if (isLoading || !data) return <Skeleton label="Loading chunks" rows={3} className="skeleton-table" />;
  const page = data;

  function selectRow(record: RecordRow) {
    select({ kind: "record", record });
  }

  return (
    <div className="doc-chunks">
      <div className="table-scroll">
        <table className="records-table" role="grid" aria-label="Chunks">
          <thead><tr><th>ID</th><th>Document</th><th>Metadata</th></tr></thead>
          <tbody>
            {page.items.map((r) => {
              const isSelected = selection?.kind === "record" && selection.record.id === r.id;
              return (
                <tr
                  key={r.id}
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => selectRow(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectRow(r);
                    }
                  }}
                >
                  <td className="cell-id">{r.id}</td>
                  <td className="cell-doc">{r.document}</td>
                  <td className="cell-meta"><code>{JSON.stringify(r.metadata)}</code></td>
                </tr>
              );
            })}
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
