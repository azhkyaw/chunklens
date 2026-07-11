import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocation, useRoute } from "wouter";
import { useCollections } from "./api/hooks";
import { CollectionsList } from "./features/collections/CollectionsList";
import { CollectionCreate } from "./features/collections/CollectionCreate";
import { CollectionDetails } from "./features/collections/CollectionDetails";
import { CollectionManage } from "./features/collections/CollectionManage";
import { ConnectionBanner } from "./features/connection/ConnectionBanner";
import { ConnectionForm } from "./features/connection/ConnectionForm";
import { ConnectionStatus } from "./features/connection/ConnectionStatus";
import { CompareQuery } from "./features/query/CompareQuery";
import { SingleQuery } from "./features/query/SingleQuery";
import { RecordsTable } from "./features/records/RecordsTable";
import { ExportButton } from "./features/io/ExportButton";
import { ImportPanel } from "./features/io/ImportPanel";
import { runExport } from "./features/io/exportRun";
import { StatusBar } from "./StatusBar";
import { ThemeToggle } from "./ThemeToggle";
import { EmptyState } from "./ui/EmptyState";
import { Modal } from "./ui/Modal";
import { MenuButton } from "./ui/MenuButton";
import { InspectorShell } from "./ui/InspectorShell";
import { Inspector } from "./features/inspector/Inspector";
import { Kbd } from "./ui/Kbd";
import { Palette, type PaletteCommand } from "./ui/Palette";
import { ShortcutsHelp } from "./ui/ShortcutsHelp";
import { SelectionProvider } from "./lib/selection";
import { getInspectorOpen, setInspectorOpen, cycleThemePref, toggleDensity, markOnboarded, wasOnboarded } from "./lib/prefs";
import { clearHistory, getHistory, requestReplay } from "./lib/queryHistory";
import { setLastLatency } from "./lib/latency";
import { useShortcut, isMac } from "./lib/shortcuts";
import { toastInfo } from "./ui/toast";
import {
  adjacentTab,
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
  const [showPalette, setShowPalette] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Which collection Manage is open for (null = closed). Deriving the open
  // flag from this instead of a plain boolean makes a stale modal
  // un-representable: switching collections changes `selected`, so
  // `manageFor === selected` goes false by construction - no reset effect
  // needed (mirrors SelectionProvider's resetKey comparison in lib/selection).
  const [manageFor, setManageFor] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpenState] = useState(getInspectorOpen);
  function toggleInspector() {
    const next = !inspectorOpen;
    setInspectorOpen(next);
    setInspectorOpenState(next);
  }
  const inspectorPane = useRef<HTMLElement>(null);
  const qc = useQueryClient();
  const { data: collections } = useCollections();

  useEffect(() => {
    if (wasOnboarded()) return;
    markOnboarded();
    toastInfo(`Press ${isMac() ? "Cmd" : "Ctrl"}+K for the command palette · ? lists every shortcut`);
  }, []);

  useShortcut("mod+k", (e) => {
    e.preventDefault();
    setShowPalette((s) => !s);
  });

  useShortcut("?", () => setShowHelp(true));

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

  useShortcut("i", toggleInspector);
  useShortcut("[", () => {
    if (selected) navigate(collectionPath(selected, adjacentTab(tab, -1)));
  });
  useShortcut("]", () => {
    if (selected) navigate(collectionPath(selected, adjacentTab(tab, 1)));
  });
  useShortcut("g c", () => {
    const item =
      document.querySelector<HTMLElement>('.rail-item[aria-pressed="true"]') ??
      document.querySelector<HTMLElement>(".rail-item");
    item?.focus();
  });
  useShortcut("enter", (e) => {
    // Buttons, links, tabs, and menu items own their Enter; rows do not, so
    // Enter on a focused row selects it (row handler) AND lands here.
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("button, a, summary, [role='tab'], [role='menuitem']")) return;
    inspectorPane.current?.focus();
  });
  useShortcut(
    "escape",
    (e) => {
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (t?.matches("input, textarea, select")) t.blur();
    },
    { inInputs: true },
  );

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

  const commands: PaletteCommand[] = [
    ...(collections ?? []).map((c) => ({
      group: "Collections",
      label: c.name,
      run: () => navigate(collectionPath(c.name)),
    })),
    ...(selected
      ? COLLECTION_TABS.map((t) => ({
          group: "Navigation",
          label: `Go to ${TAB_LABELS[t]}`,
          run: () => navigate(collectionPath(selected, t)),
        }))
      : []),
    { group: "Actions", label: "New collection", keywords: ["create"], run: () => setShowCreate(true) },
    { group: "Actions", label: "Import collection", run: () => setShowImport(true) },
    ...(selected
      ? [
          { group: "Actions", label: "Export collection", run: () => void runExport(selected, false) },
          { group: "Actions", label: "Manage collection", keywords: ["rename", "delete"], run: () => setManageFor(selected) },
        ]
      : []),
    { group: "Actions", label: "Connection settings", run: () => setShowConn(true) },
    { group: "Actions", label: "Toggle theme", keywords: ["dark", "light"], run: cycleThemePref },
    { group: "Actions", label: "Toggle density", keywords: ["compact", "comfortable", "rows"], run: toggleDensity },
    ...(selected
      ? getHistory(selected)
          // display-dedupe by label: cmdk items are identified by their value, so
          // two same-label entries (same text, different filters) would collide -
          // the most recent variant wins
          .filter((h, i, all) => all.findIndex((x) => x.label === h.label) === i)
          .map((h) => ({
            group: "Query history",
            label: h.label,
            keywords: ["history", "rerun", "query"],
            run: () => {
              requestReplay(selected, h.spec);
              navigate(collectionPath(selected, "query"));
            },
          }))
      : []),
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <h1 className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>ChunkLens</span>
          </h1>
          <div className="topbar-conn">
            <button
              type="button"
              className="palette-hint"
              aria-label="Open command palette"
              onClick={() => setShowPalette(true)}
            >
              <Kbd>{isMac() ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>K</Kbd>
            </button>
            <ThemeToggle />
            <ConnectionStatus onOpen={() => setShowConn(true)} />
          </div>
        </div>
        {/* Inside the header (not a new grid row) so the app shell layout is
            untouched when the banner appears and disappears. */}
        <ConnectionBanner onOpenSettings={() => setShowConn(true)} />
        {showConn && (
          <Modal label="Connection settings" onClose={() => setShowConn(false)}>
            <ConnectionForm
              onSaved={() => {
                refreshCollections();
                qc.invalidateQueries({ queryKey: ["connection"] });
                qc.removeQueries({ queryKey: ["collection"] });
                qc.removeQueries({ queryKey: ["records"] });
                qc.removeQueries({ queryKey: ["record"] });
                qc.removeQueries({ queryKey: ["metadata-keys"] });
                qc.removeQueries({ queryKey: ["sources"] });
                qc.removeQueries({ queryKey: ["source-records"] });
                clearHistory();
                // The previous server's latency reading must not survive a
                // connection switch - the status bar would otherwise keep
                // reporting it as if it came from the new server.
                setLastLatency(null);
                setShowConn(false);
                navigate("/");
              }}
            />
          </Modal>
        )}
        {showPalette && <Palette commands={commands} onClose={() => setShowPalette(false)} />}
        {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
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

      {selected && !redirect ? (
        <SelectionProvider resetKey={`${selected}/${tab}`}>
          <main className="main">
            <CollectionView
              name={selected}
              tab={tab}
              showManage={manageFor === selected}
              onManageChange={(open) => setManageFor(open ? selected : null)}
            />
          </main>
          <InspectorShell open={inspectorOpen} onToggle={toggleInspector} paneRef={inspectorPane}>
            <Inspector collection={selected} />
          </InspectorShell>
        </SelectionProvider>
      ) : (
        <main className="main">
          {/* The redirect arm stays first: URL canonicalization must win over
              any empty state, or a bare /c/name would render a bench instead
              of redirecting. */}
          {redirect ? (
            <Redirect to={redirect} replace />
          ) : collections && collections.length === 0 ? (
            <EmptyState
              className="empty-bench"
              title="no collections yet"
              hint="create a collection, import a JSON export, or seed demo data"
            >
              <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
                New collection
              </button>
              <button type="button" onClick={() => setShowImport(true)}>
                Import
              </button>
              <code className="empty-cmd">uv run python scripts/seed_demo.py</code>
            </EmptyState>
          ) : (
            <EmptyState
              className="empty-bench"
              title="No collection selected"
              hint="Pick a collection from the rail to inspect its records and debug retrieval."
            />
          )}
        </main>
      )}

      <StatusBar collection={selected} />
    </div>
  );
}

function CollectionView({
  name,
  tab,
  showManage,
  onManageChange,
}: {
  name: string;
  tab: CollectionTab;
  showManage: boolean;
  onManageChange: (open: boolean) => void;
}) {
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
            open={showManage}
            onOpenChange={onManageChange}
            onRenamed={(newName) => {
              qc.invalidateQueries({ queryKey: ["collections"] });
              qc.removeQueries({ queryKey: ["collection", name] });
              qc.removeQueries({ queryKey: ["records", name] });
              qc.removeQueries({ queryKey: ["record", name] });
              navigate(collectionPath(newName, tab), { replace: true });
            }}
            onDeleted={() => {
              onManageChange(false);
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
