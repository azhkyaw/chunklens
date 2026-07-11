import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "wouter";
import { useRecords } from "../../api/hooks";
import type { RecordRow } from "../../api/types";
import { useSelection } from "../../lib/selection";
import { focusSelected, nextIndex } from "../../lib/selectionMove";
import { useShortcut } from "../../lib/shortcuts";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorState } from "../../ui/ErrorState";
import { Skeleton } from "../../ui/Skeleton";
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
  const { data, isLoading, error, refetch } = useRecords(name, PAGE, offset);
  const { selection, select } = useSelection();
  const selParam = params.get("sel");
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  // Set only by a j/k move (never a click - the browser already focuses a
  // clicked row natively) so the effect below knows when to steal focus.
  const focusPending = useRef(false);

  // Restore a deep-linked selection once its row is on the loaded page.
  useEffect(() => {
    if (!selParam || selection) return;
    const row = data?.items.find((r) => r.id === selParam);
    if (row) select({ kind: "record", record: row });
  }, [data, selParam, selection, select]);

  // j/k move the selection state, but Enter is handled by whichever element
  // holds DOM focus. Without moving focus too, the still-focused row from
  // the last click re-selects itself on Enter and the selection snaps back.
  // Runs after render so the newly selected row's <tr> already exists.
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    if (selection?.kind === "record") focusSelected(tbodyRef.current, selection.record.id);
  }, [selection]);

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

  useShortcut("j", () => moveSelection(1));
  useShortcut("k", () => moveSelection(-1));

  function moveSelection(delta: number) {
    if (view !== "flat") return; // by-document rows are group disclosures, not a flat list
    const items = data?.items ?? [];
    if (items.length === 0) return;
    const cur =
      selection?.kind === "record"
        ? items.findIndex((r) => r.id === selection.record.id)
        : -1;
    const next = nextIndex(items.length, cur, delta);
    if (next !== cur) {
      focusPending.current = true;
      selectRow(items[next]);
    }
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
        <Skeleton label="Loading records" rows={6} className="skeleton-table" />
      ) : error ? (
        <ErrorState message="Failed to load records." onRetry={() => refetch()} />
      ) : data!.total === 0 ? (
        <EmptyState
          title="no records"
          hint="this collection is empty - add records from your app or import a JSON export"
        />
      ) : (
        <>
          <div className="table-scroll">
            <table className="records-table" role="grid" aria-label="Records">
              <thead>
                <tr><th>ID</th><th>Document</th><th>Metadata</th></tr>
              </thead>
              <tbody ref={tbodyRef}>
                {data!.items.map((r) => {
                  const isSelected =
                    selection?.kind === "record" && selection.record.id === r.id;
                  return (
                    <tr
                      key={r.id}
                      data-id={r.id}
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
