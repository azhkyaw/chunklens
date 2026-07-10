import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocation, useRoute } from "wouter";
import { CollectionsList } from "./features/collections/CollectionsList";
import { CollectionCreate } from "./features/collections/CollectionCreate";
import { CollectionDetails } from "./features/collections/CollectionDetails";
import { CollectionManage } from "./features/collections/CollectionManage";
import { ConnectionForm } from "./features/connection/ConnectionForm";
import { ConnectionStatus } from "./features/connection/ConnectionStatus";
import { CompareQuery } from "./features/query/CompareQuery";
import { SingleQuery } from "./features/query/SingleQuery";
import { RecordsTable } from "./features/records/RecordsTable";
import { ExportButton } from "./features/io/ExportButton";
import { ImportPanel } from "./features/io/ImportPanel";
import { StatusBar } from "./StatusBar";
import { ThemeToggle } from "./ThemeToggle";
import { Modal } from "./ui/Modal";
import { MenuButton } from "./ui/MenuButton";
import {
  COLLECTION_TABS,
  TAB_LABELS,
  collectionPath,
  isCollectionTab,
  type CollectionTab,
} from "./lib/routes";

export function App() {
  const [location, navigate] = useLocation();
  const [onTab, tabParams] = useRoute("/c/:collection/:tab");
  const [onBare, bareParams] = useRoute("/c/:collection");
  const [showConn, setShowConn] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const qc = useQueryClient();

  // Chroma collection names are [a-zA-Z0-9._-], so decode is a no-op today;
  // it stays correct if the charset ever widens.
  const selected =
    onTab && tabParams
      ? decodeURIComponent(tabParams.collection)
      : onBare && bareParams
        ? decodeURIComponent(bareParams.collection)
        : null;
  const tab: CollectionTab =
    onTab && tabParams && isCollectionTab(tabParams.tab) ? tabParams.tab : "records";

  // URL canonicalization, rendered as the main content so the shell stays
  // mounted during the (replace) redirect: bare /c/name -> its records tab,
  // unknown tab -> records, any other unknown path -> home.
  let redirect: string | null = null;
  if (onBare && selected) redirect = collectionPath(selected);
  else if (onTab && tabParams && !isCollectionTab(tabParams.tab) && selected)
    redirect = collectionPath(selected);
  else if (!onTab && !onBare && location !== "/") redirect = "/";

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
            <ThemeToggle />
            <ConnectionStatus onOpen={() => setShowConn(true)} />
          </div>
        </div>
        {showConn && (
          <Modal label="Connection settings" onClose={() => setShowConn(false)}>
            <ConnectionForm
              onSaved={() => {
                refreshCollections();
                qc.invalidateQueries({ queryKey: ["connection"] });
                qc.removeQueries({ queryKey: ["collection"] });
                qc.removeQueries({ queryKey: ["records"] });
                qc.removeQueries({ queryKey: ["metadata-keys"] });
                qc.removeQueries({ queryKey: ["sources"] });
                qc.removeQueries({ queryKey: ["source-records"] });
                setShowConn(false);
                navigate("/");
              }}
            />
          </Modal>
        )}
      </header>

      <aside className="sidebar">
        <div className="rail-head">
          <p className="eyebrow">Collections</p>
          <MenuButton
            label="Add collection"
            items={[
              { label: "New collection", onSelect: () => setShowCreate(true) },
              { label: "Import collection", onSelect: () => setShowImport(true) },
            ]}
          />
        </div>
        {showCreate && (
          <Modal label="New collection" onClose={() => setShowCreate(false)}>
            <CollectionCreate
              onCreated={(name) => {
                refreshCollections();
                setShowCreate(false);
                navigate(collectionPath(name));
              }}
            />
          </Modal>
        )}
        {showImport && (
          <Modal label="Import collection" onClose={() => setShowImport(false)}>
            <ImportPanel
              onImported={(name) => {
                refreshCollections();
                setShowImport(false);
                navigate(collectionPath(name));
              }}
            />
          </Modal>
        )}
        <CollectionsList selected={selected} onSelect={(name) => navigate(collectionPath(name))} />
      </aside>

      <main className="main">
        {redirect ? (
          <Redirect to={redirect} replace />
        ) : selected ? (
          <CollectionView name={selected} tab={tab} />
        ) : (
          <div className="empty-bench">
            <span className="empty-mark" aria-hidden="true" />
            <p className="empty-title">No collection selected</p>
            <p className="muted">Pick a collection from the rail to inspect its records and debug retrieval.</p>
          </div>
        )}
      </main>

      <StatusBar collection={selected} />
    </div>
  );
}

function CollectionView({ name, tab }: { name: string; tab: CollectionTab }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  return (
    <>
      <div className="collection-head">
        <p className="eyebrow">Collection</p>
        <h2>{name}</h2>
        <div className="collection-actions">
          <CollectionManage
            name={name}
            onRenamed={(newName) => {
              qc.invalidateQueries({ queryKey: ["collections"] });
              qc.removeQueries({ queryKey: ["collection", name] });
              qc.removeQueries({ queryKey: ["records", name] });
              navigate(collectionPath(newName, tab), { replace: true });
            }}
            onDeleted={() => {
              qc.invalidateQueries({ queryKey: ["collections"] });
              navigate("/");
            }}
          />
          <ExportButton name={name} />
        </div>
      </div>
      <CollectionDetails name={name} />
      <div className="view-switch" role="tablist" aria-label="Collection view">
        {COLLECTION_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            className="view-tab"
            aria-selected={tab === t}
            onClick={() => navigate(collectionPath(name, t))}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      {/* key={name} remounts per collection so paging, grouping, query drafts,
          and edit-draft state never leak from one collection into another */}
      {tab === "records" && <RecordsTable key={name} name={name} />}
      {tab === "query" && (
        <section className="query-console">
          <SingleQuery key={name} name={name} />
        </section>
      )}
      {tab === "compare" && (
        <section className="query-console">
          <CompareQuery key={name} name={name} />
        </section>
      )}
    </>
  );
}
