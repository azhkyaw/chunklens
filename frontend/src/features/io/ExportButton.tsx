import { useState } from "react";
import { api } from "../../api/client";
import { serializeExport, triggerDownload } from "./download";

export function ExportButton({ name }: { name: string }) {
  const [includeVectors, setIncludeVectors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const data = await api.exportCollection(name, includeVectors);
      triggerDownload(`${name}.chunklens.json`, serializeExport(data));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="export-control">
      <button type="button" onClick={run} disabled={busy}>Export</button>
      <label className="field-inline faint">
        <input type="checkbox" checked={includeVectors} onChange={(e) => setIncludeVectors(e.target.checked)} />
        include vectors
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
