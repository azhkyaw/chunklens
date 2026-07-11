import { useEffect, useState } from "react";
import { useSearchParams } from "wouter";
import { useRecords } from "../../api/hooks";
import type { RecordRow } from "../../api/types";
import { useSelection } from "../../lib/selection";
import { RecordsByDocument } from "./RecordsByDocument";

const PAGE = 25;

export function RecordsTable({ name }: { name: string }) {
  const [view, setView] = useState<"flat" | "doc">("flat");
  const [params, setParams] = useSearchParams();
  const rawOffset = Number(params.get("offset") ?? "0");
  // Snap to a page boundary and reject garbage so a hand-edited URL cannot
  // produce a misaligned or negative page.
  const offset =
    Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset / PAGE) * PAGE : 0;
  const { data, isLoading, error } = useRecords(name, PAGE, offset);
  const { selection, select } = useSelection();
  const selParam = params.get("sel");

  // Restore a deep-linked selection once its row is on the loaded page.
  useEffect(() => {
    if (!selParam || selection) return;
    const row = data?.items.find((r) => r.id === selParam);
    if (row) select({ kind: "record", record: row });
  }, [data, selParam, selection, select]);

  function selectRow(record: RecordRow) {
    select({ kind: "record", record });
    // replace: selection churn should not pollute browser history
    setParams(
      (prev) => {
        prev.set("sel", record.id);
        return prev;
      },
      { replace: true },
    );
  }

  function goTo(nextOffset: number) {
    setParams((prev) => {
      if (nextOffset <= 0) prev.delete("offset");
      else prev.set("offset", String(nextOffset));
      return prev;
    });
  }

  return (
    <section className="records">
      <div className="records-head">
        <p className="eyebrow">Records</p>
        <div role="tablist" className="tabs records-view" aria-label="Records grouping">
          <button type="button" role="tab" className="tab" aria-selected={view === "flat"}
                  onClick={() => setView("flat")}>Flat</button>
          <button type="button" role="tab" className="tab" aria-selected={view === "doc"}
                  onClick={() => setView("doc")}>By document</button>
        </div>
      </div>

      {view === "doc" ? (
        <RecordsByDocument name={name} />
      ) : isLoading ? (
        <p className="muted">Loading records…</p>
      ) : error ? (
        <p role="alert">Failed to load records.</p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="records-table" role="grid" aria-label="Records">
              <thead>
                <tr><th>ID</th><th>Document</th><th>Metadata</th></tr>
              </thead>
              <tbody>
                {data!.items.map((r) => {
                  const isSelected =
                    selection?.kind === "record" && selection.record.id === r.id;
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

          <div className="pager">
            <button disabled={offset === 0} onClick={() => goTo(Math.max(0, offset - PAGE))}>Prev</button>
            <span className="pager-status">
              {data!.total === 0 ? 0 : offset + 1}–{Math.min(offset + PAGE, data!.total)} of {data!.total}
            </span>
            <button disabled={offset + PAGE >= data!.total} onClick={() => goTo(offset + PAGE)}>Next</button>
          </div>
        </>
      )}
    </section>
  );
}
