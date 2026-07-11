import { useEffect, useState } from "react";
import { useCollectionDetails, useDeleteCollection, useUpdateCollection } from "../../api/hooks";
import { MetadataEditor, parseScalarMetadata } from "./MetadataEditor";
import { Modal } from "../../ui/Modal";
import { toastSuccess } from "../../ui/toast";

export function CollectionManage({
  name,
  open,
  onOpenChange,
  onRenamed,
  onDeleted,
}: {
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenamed: (newName: string) => void;
  onDeleted: () => void;
}) {
  const { data } = useCollectionDetails(name);
  const update = useUpdateCollection(name);
  const del = useDeleteCollection();

  const [newName, setNewName] = useState(name);
  const [metaText, setMetaText] = useState("");
  const [metaDirty, setMetaDirty] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNewName(name);
    setConfirm("");
  }, [name]);
  useEffect(() => {
    // Reseed from the server only while the user has not touched the editor;
    // a focus-refetch must not eat a half-written edit. (audit M-3)
    if (data && !metaDirty) setMetaText(JSON.stringify(data.metadata ?? {}, null, 2));
  }, [data, metaDirty]);

  function close() {
    onOpenChange(false);
    setError(null);
    setMetaDirty(false);
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
    update.mutate(
      { metadata },
      {
        onSuccess: () => {
          setMetaDirty(false);
          toastSuccess("Collection metadata saved");
        },
        onError: (e) => setError((e as Error).message),
      },
    );
  }

  function rename() {
    setError(null);
    if (newName && newName !== name) {
      update.mutate(
        { name: newName },
        {
          onSuccess: () => {
            onOpenChange(false);
            toastSuccess(`Renamed to ${newName}`);
            onRenamed(newName);
          },
          onError: (e) => setError((e as Error).message),
        },
      );
    }
  }

  return (
    <>
      <button type="button" onClick={() => onOpenChange(true)} aria-haspopup="dialog">
        Manage
      </button>
      {open && (
        <Modal label="Manage collection" onClose={close}>
          <h3>Manage collection</h3>
          <div className="manage-body">
            <div className="form-row">
              <label className="field" style={{ flex: 1 }}>Rename <input value={newName} onChange={(e) => setNewName(e.target.value)} /></label>
              <button type="button" onClick={rename} disabled={update.isPending}>Save name</button>
            </div>

            <div>
              <MetadataEditor
                value={metaText}
                onChange={(v) => { setMetaDirty(true); setMetaText(v); }}
                label="Collection metadata (JSON)"
              />
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
                onClick={() =>
                  del.mutate(name, {
                    onSuccess: () => { toastSuccess(`Deleted ${name}`); onDeleted(); },
                    onError: (e) => setError((e as Error).message),
                  })
                }
              >
                Delete
              </button>
            </div>

            {error && <p role="alert">{error}</p>}
          </div>
          <div className="form-actions">
            <button type="button" onClick={close}>Close</button>
          </div>
        </Modal>
      )}
    </>
  );
}
