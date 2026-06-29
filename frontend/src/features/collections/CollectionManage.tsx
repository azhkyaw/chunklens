import { useEffect, useState } from "react";
import { useCollectionDetails, useDeleteCollection, useUpdateCollection } from "../../api/hooks";
import { MetadataEditor, parseScalarMetadata } from "./MetadataEditor";

export function CollectionManage({
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

  const [open, setOpen] = useState(false);
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

  function close() {
    setOpen(false);
    setError(null);
  }

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
        {
          onSuccess: () => {
            setOpen(false);
            onRenamed(newName);
          },
          onError: (e) => setError((e as Error).message),
        },
      );
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">
        Manage
      </button>
      {open && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div role="dialog" aria-modal="true" aria-label="Manage collection" className="panel record-edit">
            <h3>Manage collection</h3>
            <div className="manage-body">
              <div className="form-row">
                <label className="field" style={{ flex: 1 }}>Rename <input value={newName} onChange={(e) => setNewName(e.target.value)} /></label>
                <button type="button" onClick={rename} disabled={update.isPending}>Save name</button>
              </div>

              <div>
                <MetadataEditor value={metaText} onChange={setMetaText} label="Collection metadata (JSON)" />
                <div className="form-actions">
                  <button type="button" onClick={saveMeta} disabled={update.isPending}>Save metadata</button>
                </div>
              </div>

              <div className="danger-zone">
                <label className="field" style={{ flex: 1 }}>
                  Type the name to delete
                  <input value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </label>
                <button
                  type="button"
                  className="btn-danger"
                  disabled={confirm !== name || del.isPending}
                  onClick={() => del.mutate(name, { onSuccess: onDeleted })}
                >
                  Delete
                </button>
              </div>

              {error && <p role="alert">{error}</p>}
            </div>
            <div className="form-actions">
              <button type="button" onClick={close}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
