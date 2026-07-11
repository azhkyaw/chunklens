import { useQueryClient } from "@tanstack/react-query";
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
  const qc = useQueryClient();
  const { data } = useCollectionDetails(name);
  const update = useUpdateCollection(name);
  const del = useDeleteCollection();

  const [newName, setNewName] = useState(name);
  const [metaText, setMetaText] = useState("");
  const [metaDirty, setMetaDirty] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The collection identity changed (a sidebar switch, or our own rename -
    // App keeps this component mounted and only swaps the `name` prop). Drop
    // every field derived from the previous collection, INCLUDING the metadata
    // editor and its dirty flag: an abandoned edit must not survive as the new
    // collection's metadata, and a stuck `metaDirty` would gate the reseed
    // below off forever, pinning the editor to the old text.
    setNewName(name);
    setConfirm("");
    setMetaText("");
    setMetaDirty(false);
  }, [name]);
  useEffect(() => {
    // Reseed from the server only while the user has not touched the editor;
    // a focus-refetch must not eat a half-written edit. (audit M-3)
    //
    // `metaDirty` is a dependency, so this also re-runs the moment the flag
    // clears (save-success, close). `data` must therefore be fresh whenever we
    // clear it - see saveMeta, which writes the server's response into the
    // cache before flipping the flag.
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
        onSuccess: (updated) => {
          // PATCH returns the updated CollectionDetails, so it is the freshest
          // server truth we have, and the cache MUST hold it before the reseed
          // effect above next runs. Clearing the dirty flag re-runs that effect,
          // and against a stale cache it would reseed the editor from the
          // pre-save metadata, visibly reverting the save - after which a second
          // Save click would PUT that stale value back and drop every user key
          // (chroma_service._merge_collection_metadata swaps user keys wholesale).
          // setQueryData writes the observer snapshot synchronously, so that
          // holds no matter which order these two statements run in. Invalidating
          // instead would NOT: the stale object stays cached until the refetch
          // lands, leaving exactly that window open.
          qc.setQueryData(["collection", name], updated);
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
            // close() - not a bare onOpenChange(false) - so the dirty flag and
            // the inline error are cleared too. The `name`-change effect above
            // then clears the editor text itself.
            close();
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
