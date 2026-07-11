import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConnection, useRecord, useUpdateRecordMetadata } from "../../api/hooks";
import type { ScalarMetadata } from "../../api/types";
import { useSelection, type Selection } from "../../lib/selection";
import { copyText } from "../../lib/copy";
import { recordGetAsJs, recordGetAsPython } from "../../lib/copyAsCode";
import { toastSuccess } from "../../ui/toast";
import { MetadataEditor, parseScalarMetadata } from "../collections/MetadataEditor";
import { MetadataTable } from "../retrieval/MetadataTable";
import { interpretScore } from "../retrieval/scoring";

export function Inspector({ collection }: { collection: string }) {
  const { selection, select } = useSelection();
  const { data: conn } = useConnection();
  // Raw persists across selections on purpose: browsing raw views with j/k
  // should not keep snapping back to pretty.
  const [raw, setRaw] = useState(false);

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
      <div className="inspector-actions">
        <button
          type="button"
          className="btn-sm"
          disabled={!conn}
          onClick={() => conn && copyText(recordGetAsPython(conn, collection, rec.id), "Python snippet")}
        >
          Copy as Python
        </button>
        <button
          type="button"
          className="btn-sm"
          disabled={!conn}
          onClick={() => conn && copyText(recordGetAsJs(conn, collection, rec.id), "JS snippet")}
        >
          Copy as JS
        </button>
        <button type="button" className="btn-sm" aria-pressed={raw} onClick={() => setRaw((r) => !r)}>
          Raw JSON
        </button>
      </div>
      {raw ? (
        <RawView collection={collection} selection={selection} />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

// Records show the full fetched detail (incl. embedding); hits show exactly
// the query response payload, so no fetch is made for them.
function RawView({
  collection,
  selection,
}: {
  collection: string;
  selection: Extract<Selection, { kind: "record" } | { kind: "hit" }>;
}) {
  const isRecord = selection.kind === "record";
  const detail = useRecord(collection, isRecord ? selection.record.id : null);
  const entity = isRecord ? (detail.data ?? selection.record) : selection.hit;
  const json = JSON.stringify(entity, null, 2);
  return (
    <section className="inspector-section">
      <div className="inspector-section-head">
        <p className="eyebrow">Raw JSON</p>
        <button type="button" className="btn-sm" onClick={() => copyText(json, "JSON")}>
          Copy JSON
        </button>
      </div>
      {isRecord && detail.isLoading ? (
        <p className="muted">Loading full record…</p>
      ) : (
        <pre className="inspector-raw" data-testid="inspector-raw">{json}</pre>
      )}
    </section>
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
          toastSuccess("Metadata saved");
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
  const embedding = data?.embedding && data.embedding.length > 0 ? data.embedding : null;
  return (
    <section className="inspector-section">
      <div className="inspector-section-head">
        <p className="eyebrow">Embedding</p>
        {embedding && (
          <button
            type="button"
            className="btn-sm"
            onClick={() => copyText(JSON.stringify(embedding), "Vector")}
          >
            Copy vector
          </button>
        )}
      </div>
      {error ? (
        <p role="alert">Failed to load the embedding.</p>
      ) : isLoading || !data ? (
        <p className="muted">Loading embedding…</p>
      ) : embedding ? (
        <>
          <p className="inspector-dim">dim {embedding.length}</p>
          <p className="inspector-emb">
            [{embedding.slice(0, 8).map((v) => v.toFixed(4)).join(", ")}
            {embedding.length > 8 ? ", …" : ""}]
          </p>
        </>
      ) : (
        <p className="muted">No stored embedding.</p>
      )}
    </section>
  );
}
