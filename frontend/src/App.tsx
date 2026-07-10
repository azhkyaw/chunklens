import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CollectionsList } from "./features/collections/CollectionsList";
import { CollectionCreate } from "./features/collections/CollectionCreate";
import { CollectionDetails } from "./features/collections/CollectionDetails";
import { CollectionManage } from "./features/collections/CollectionManage";
import { ConnectionForm } from "./features/connection/ConnectionForm";
import { ConnectionStatus } from "./features/connection/ConnectionStatus";
import { QueryPanel } from "./features/query/QueryPanel";
import { RecordsTable } from "./features/records/RecordsTable";
import { ExportButton } from "./features/io/ExportButton";
import { ImportPanel } from "./features/io/ImportPanel";

export function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showConn, setShowConn] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [view, setView] = useState<"records" | "query">("records");
  useEffect(() => setView("records"), [selected]);
  const qc = useQueryClient();

  function refreshCollections() {
    qc.invalidateQueries({ queryKey: ["collections"] });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <h1 className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>ChunkLens</span>
          </h1>
          <div className="topbar-conn">
            <ConnectionStatus />
            <button onClick={() => setShowConn((s) => !s)} aria-expanded={showConn}>
              Connection
            </button>
          </div>
        </div>
        {showConn && (
          <div className="conn-popover panel">
            <ConnectionForm
              onSaved={() => {
                refreshCollections();
                qc.invalidateQueries({ queryKey: ["connection"] });
                setSelected(null);
                qc.removeQueries({ queryKey: ["collection"] });
                qc.removeQueries({ queryKey: ["records"] });
                qc.removeQueries({ queryKey: ["metadata-keys"] });
                setShowConn(false);
              }}
            />
          </div>
        )}
      </header>

      <aside className="sidebar">
        <div className="rail-head">
          <p className="eyebrow">Collections</p>
          <div className="rail-head-actions">
            <button onClick={() => setShowImport((s) => !s)} aria-expanded={showImport}>Import</button>
            <button onClick={() => setShowCreate((s) => !s)} aria-expanded={showCreate}>New collection</button>
          </div>
        </div>
        {showImport && (
          <div className="panel panel-tight">
            <ImportPanel
              onImported={(name) => {
                refreshCollections();
                setSelected(name);
                setShowImport(false);
              }}
            />
          </div>
        )}
        {showCreate && (
          <div className="panel panel-tight">
            <CollectionCreate
              onCreated={(name) => {
                refreshCollections();
                setSelected(name);
                setShowCreate(false);
              }}
            />
          </div>
        )}
        <CollectionsList selected={selected} onSelect={setSelected} />
      </aside>

      <main className="main">
        {selected ? (
          <>
            <div className="collection-head">
              <p className="eyebrow">Collection</p>
              <h2>{selected}</h2>
              <div className="collection-actions">
                <CollectionManage
                  name={selected}
                  onRenamed={(newName) => {
                    refreshCollections();
                    qc.removeQueries({ queryKey: ["collection", selected] });
                    qc.removeQueries({ queryKey: ["records", selected] });
                    setSelected(newName);
                  }}
                  onDeleted={() => {
                    refreshCollections();
                    setSelected(null);
                  }}
                />
                <ExportButton name={selected} />
              </div>
            </div>
            <CollectionDetails name={selected} />
            <div className="view-switch" role="tablist" aria-label="Collection view">
              <button type="button" role="tab" aria-selected={view === "records"}
                      className="view-tab" onClick={() => setView("records")}>Records</button>
              <button type="button" role="tab" aria-selected={view === "query"}
                      className="view-tab" onClick={() => setView("query")}>Query</button>
            </div>
            {/* key={selected} remounts per collection so paging, grouping, and
                edit-draft state never leak from one collection into another */}
            {view === "records" ? <RecordsTable key={selected} name={selected} /> : <QueryPanel name={selected} />}
          </>
        ) : (
          <div className="empty-bench">
            <span className="empty-mark" aria-hidden="true" />
            <p className="empty-title">No collection selected</p>
            <p className="muted">Pick a collection from the rail to inspect its records and debug retrieval.</p>
          </div>
        )}
      </main>
    </div>
  );
}
