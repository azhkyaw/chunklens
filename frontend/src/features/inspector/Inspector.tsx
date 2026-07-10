import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRecord, useUpdateRecordMetadata } from "../../api/hooks";
import type { ScalarMetadata } from "../../api/types";
import { useSelection, type Selection } from "../../lib/selection";
import { MetadataEditor, parseScalarMetadata } from "../collections/MetadataEditor";
import { MetadataTable } from "../retrieval/MetadataTable";
import { interpretScore } from "../retrieval/scoring";

export function Inspector({ collection }: { collection: string }) {
  const { selection, select } = useSelection();

  if (!selection) {
    return <p className="inspector-idle muted">Select a row to inspect it here.</p>;
  }

  if (selection.kind === "source") {
    return (
      <div className="inspector-detail">
        <p className="inspector-id">{selection.value === "" ? "(empty)" : selection.value}</p>
        <dl className="inspector-source">
          <dt>Key</dt>
          <dd>{selection.sourceKey}</dd>
          <dt>Chunks</dt>
          <dd>{selection.count}</dd>
        </dl>
        <p className="muted">Open the document in the table to inspect its chunks.</p>
      </div>
    );
  }

  const rec = selection.kind === "record" ? selection.record : selection.hit;

  // Keep the live selection's metadata in sync after a save so the inspector
  // shows fresh values without a reselect.
  function onMetadataSaved(metadata: Record<string, unknown> | null) {
    if (selection?.kind === "record") {
      select({ kind: "record", record: { ...selection.record, metadata } });
    } else if (selection?.kind === "hit") {
      select({ ...selection, hit: { ...selection.hit, metadata } });
    }
  }

  return (
    <div className="inspector-detail">
      <p className="inspector-id">{rec.id}</p>
      {selection.kind === "hit" && <HitContext sel={selection} />}
      <section className="inspector-section">
        <p className="eyebrow">Document</p>
        {rec.document ? (
          <pre className="inspector-doc">{rec.document}</pre>
        ) : (
          <p className="muted">(no document)</p>
        )}
      </section>
      {/* key: a new selection resets any in-progress edit */}
      <MetadataSection key={rec.id} collection={collection} record={rec} onSaved={onMetadataSaved} />
      <EmbeddingBlock collection={collection} id={rec.id} />
    </div>
  );
}

function HitContext({ sel }: { sel: Extract<Selection, { kind: "hit" }> }) {
  const score = interpretScore(sel.hit.distance, sel.metric);
  return (
    <p className="inspector-hit-context">
      <span className="hit-rank">#{sel.rank}</span>{" "}
      <span className="hit-score">{score.primary}</span>
      {sel.side && <span className="inspector-side"> · Query {sel.side}</span>}
      {sel.delta != null && sel.delta !== 0 && (
        <span className={sel.delta > 0 ? "delta-up" : "delta-down"}>
          {" · "}
          {sel.delta > 0 ? "▲" : "▼"}
          {Math.abs(sel.delta)} A to B
        </span>
      )}
    </p>
  );
}

function MetadataSection({
  collection,
  record,
  onSaved,
}: {
  collection: string;
  record: { id: string; metadata: Record<string, unknown> | null };
  onSaved: (metadata: Record<string, unknown> | null) => void;
}) {
  const qc = useQueryClient();
  const update = useUpdateRecordMetadata(collection);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setText(JSON.stringify(record.metadata ?? {}, null, 2));
    setError(null);
    setEditing(true);
  }

  function save() {
    setError(null);
    let metadata: ScalarMetadata;
    try {
      metadata = parseScalarMetadata(text);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    update.mutate(
      { id: record.id, metadata },
      {
        onSuccess: (saved) => {
          qc.invalidateQueries({ queryKey: ["records", collection] });
          qc.invalidateQueries({ queryKey: ["source-records", collection] });
          qc.invalidateQueries({ queryKey: ["record", collection, record.id] });
          setEditing(false);
          onSaved(saved.metadata ?? null);
        },
        onError: (err) => setError((err as Error).message),
      },
    );
  }

  return (
    <section className="inspector-section">
      <div className="inspector-section-head">
        <p className="eyebrow">Metadata</p>
        {!editing && (
          <button type="button" className="btn-sm" onClick={startEdit}>
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <>
          <MetadataEditor value={text} onChange={setText} label="Record metadata (JSON)" autoFocus />
          <div className="form-actions">
            <button type="button" className="btn-primary" onClick={save} disabled={update.isPending}>
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </>
      ) : (
        <MetadataTable metadata={record.metadata} />
      )}
    </section>
  );
}

function EmbeddingBlock({ collection, id }: { collection: string; id: string }) {
  const { data, isLoading, error } = useRecord(collection, id);
  return (
    <section className="inspector-section">
      <p className="eyebrow">Embedding</p>
      {error ? (
        <p role="alert">Failed to load the embedding.</p>
      ) : isLoading || !data ? (
        <p className="muted">Loading embedding…</p>
      ) : data.embedding && data.embedding.length > 0 ? (
        <>
          <p className="inspector-dim">dim {data.embedding.length}</p>
          <p className="inspector-emb">
            [{data.embedding.slice(0, 8).map((v) => v.toFixed(4)).join(", ")}
            {data.embedding.length > 8 ? ", …" : ""}]
          </p>
        </>
      ) : (
        <p className="muted">No stored embedding.</p>
      )}
    </section>
  );
}
