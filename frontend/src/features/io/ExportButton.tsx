import { useState } from "react";
import { runExport } from "./exportRun";

export function ExportButton({ name }: { name: string }) {
  const [includeVectors, setIncludeVectors] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await runExport(name, includeVectors);
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
    </div>
  );
}
