import { useEffect, useState } from "react";
import { useCollectionDetails, useDeleteCollection, useUpdateCollection } from "../../api/hooks";
import { MetadataEditor, parseScalarMetadata } from "./MetadataEditor";

export function CollectionDetails({
  name,
  onRenamed,
  onDeleted,
}: {
  name: string;
  onRenamed: (newName: string) => void;
  onDeleted: () => void;
}) {
  const { data } = useCollectionDetails(name);
  const update = useUpdateCollection(name);
  const del = useDeleteCollection();

  const [newName, setNewName] = useState(name);
  const [metaText, setMetaText] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNewName(name);
    setConfirm("");
  }, [name]);
  useEffect(() => {
    if (data) setMetaText(JSON.stringify(data.metadata ?? {}, null, 2));
  }, [data]);

  if (!data) return <p>Loading details…</p>;

  function saveMeta() {
    setError(null);
    let metadata;
    try {
      metadata = parseScalarMetadata(metaText);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    update.mutate({ metadata }, { onError: (e) => setError((e as Error).message) });
  }

  function rename() {
    setError(null);
    if (newName && newName !== name) {
      update.mutate(
        { name: newName },
        { onSuccess: () => onRenamed(newName), onError: (e) => setError((e as Error).message) },
      );
    }
  }

  return (
    <section>
      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 12px" }}>
        <dt>Records</dt><dd>{data.count}</dd>
        <dt>Dimensionality</dt><dd>{data.dimensionality ?? "-"}</dd>
        <dt>Distance metric</dt><dd>{data.distance_metric}</dd>
        <dt>Embedding function</dt><dd>{data.embedding_function}</dd>
      </dl>

      <div>
        <label>Rename <input value={newName} onChange={(e) => setNewName(e.target.value)} /></label>
        <button type="button" onClick={rename} disabled={update.isPending}>Save name</button>
      </div>

      <MetadataEditor value={metaText} onChange={setMetaText} label="Collection metadata (JSON)" />
      <button type="button" onClick={saveMeta} disabled={update.isPending}>Save metadata</button>

      <div>
        <label>
          Type the name to delete{" "}
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <button
          type="button"
          disabled={confirm !== name || del.isPending}
          onClick={() => del.mutate(name, { onSuccess: onDeleted })}
        >
          Delete
        </button>
      </div>

      {error && <p role="alert">{error}</p>}
    </section>
  );
}
