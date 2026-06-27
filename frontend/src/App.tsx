import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CollectionsList } from "./features/collections/CollectionsList";
import { ConnectionForm } from "./features/connection/ConnectionForm";
import { ConnectionStatus } from "./features/connection/ConnectionStatus";
import { QueryPanel } from "./features/query/QueryPanel";
import { RecordsTable } from "./features/records/RecordsTable";

export function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showConn, setShowConn] = useState(false);
  const qc = useQueryClient();
  return (
    <div className="app">
      <aside className="sidebar">
        <h1 style={{ fontSize: 18 }}>ChunkLens</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <ConnectionStatus />
          <button onClick={() => setShowConn((s) => !s)}>Connection</button>
        </div>
        {showConn && (
          <ConnectionForm
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["collections"] });
              qc.invalidateQueries({ queryKey: ["connection"] });
              setShowConn(false);
            }}
          />
        )}
        <CollectionsList selected={selected} onSelect={setSelected} />
      </aside>
      <main className="main">
        {selected ? (
          <>
            <h2>{selected}</h2>
            <RecordsTable name={selected} />
            <QueryPanel name={selected} />
          </>
        ) : (
          <p>Select a collection.</p>
        )}
      </main>
    </div>
  );
}
