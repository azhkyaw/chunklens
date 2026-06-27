import { useState } from "react";
import { CollectionsList } from "./features/collections/CollectionsList";
import { QueryPanel } from "./features/query/QueryPanel";
import { RecordsTable } from "./features/records/RecordsTable";

export function App() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="app">
      <aside className="sidebar">
        <h1 style={{ fontSize: 18 }}>ChunkLens</h1>
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
