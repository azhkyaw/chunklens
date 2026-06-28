import { useState } from "react";
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

  if (isLoading) return <p>Loading records…</p>;
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
    <div>
      <table>
        <thead>
          <tr><th>ID</th><th>Document</th><th>Metadata</th><th /></tr>
        </thead>
        <tbody>
          {page.items.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.document}</td>
              <td><code>{JSON.stringify(r.metadata)}</code></td>
              <td>
                <button type="button" onClick={() => startEdit(r.id, r.metadata)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editId && (
        <div role="dialog" aria-label="Edit record metadata">
          <p>Editing <strong>{editId}</strong></p>
          <MetadataEditor value={metaText} onChange={setMetaText} label="Record metadata (JSON)" />
          <button type="button" onClick={save} disabled={update.isPending}>Save</button>
          <button type="button" onClick={() => setEditId(null)}>Cancel</button>
          {editError && <p role="alert">{editError}</p>}
        </div>
      )}

      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
          Prev
        </button>
        <span>
          {page.total === 0 ? 0 : offset + 1}–{Math.min(offset + PAGE, page.total)} of {page.total}
        </span>
        <button disabled={offset + PAGE >= page.total} onClick={() => setOffset(offset + PAGE)}>
          Next
        </button>
      </div>
    </div>
  );
}
