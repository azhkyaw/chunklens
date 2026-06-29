import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRecords, useUpdateRecordMetadata } from "../../api/hooks";
import { MetadataEditor, parseScalarMetadata } from "../collections/MetadataEditor";

const PAGE = 25;

export function RecordsTable({ name }: { name: string }) {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useRecords(name, PAGE, offset);
  const qc = useQueryClient();
  const update = useUpdateRecordMetadata(name);
  const [editId, setEditId] = useState<string | null>(null);
  const [metaText, setMetaText] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Close the edit modal on Escape (only while it is open)
  useEffect(() => {
    if (!editId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editId]);

  if (isLoading) return <p className="muted">Loading records…</p>;
  if (error) return <p role="alert">Failed to load records.</p>;
  const page = data!;

  function startEdit(id: string, metadata: unknown) {
    setEditId(id);
    setMetaText(JSON.stringify(metadata ?? {}, null, 2));
    setEditError(null);
  }

  function save() {
    setEditError(null);
    let metadata;
    try {
      metadata = parseScalarMetadata(metaText);
    } catch (err) {
      setEditError((err as Error).message);
      return;
    }
    update.mutate(
      { id: editId as string, metadata },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["records", name] });
          setEditId(null);
        },
        onError: (err) => setEditError((err as Error).message),
      },
    );
  }

  return (
    <section className="records">
      <p className="eyebrow">Records</p>
      <div className="table-scroll">
        <table className="records-table">
          <thead>
            <tr><th>ID</th><th>Document</th><th>Metadata</th><th></th></tr>
          </thead>
          <tbody>
            {page.items.map((r) => (
              <tr key={r.id}>
                <td className="cell-id">{r.id}</td>
                <td className="cell-doc">{r.document}</td>
                <td className="cell-meta"><code>{JSON.stringify(r.metadata)}</code></td>
                <td className="cell-actions">
                  <button type="button" className="btn-sm" onClick={() => startEdit(r.id, r.metadata)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editId && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setEditId(null); }}
        >
          <div role="dialog" aria-modal="true" aria-label="Edit record metadata" className="panel record-edit">
            <p className="muted">Editing <strong className="mono">{editId}</strong></p>
            <MetadataEditor value={metaText} onChange={setMetaText} label="Record metadata (JSON)" autoFocus />
            <div className="form-actions">
              <button type="button" className="btn-primary" onClick={save} disabled={update.isPending}>Save</button>
              <button type="button" onClick={() => setEditId(null)}>Cancel</button>
            </div>
            {editError && <p role="alert">{editError}</p>}
          </div>
        </div>
      )}

      <div className="pager">
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
          Prev
        </button>
        <span className="pager-status">
          {page.total === 0 ? 0 : offset + 1}–{Math.min(offset + PAGE, page.total)} of {page.total}
        </span>
        <button disabled={offset + PAGE >= page.total} onClick={() => setOffset(offset + PAGE)}>
          Next
        </button>
      </div>
    </section>
  );
}
