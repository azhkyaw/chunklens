// Route vocabulary for the workbench. The URL is the source of truth for
// which collection and tab are open: /c/<name>/<tab>.
export const COLLECTION_TABS = ["records", "query", "compare"] as const;
export type CollectionTab = (typeof COLLECTION_TABS)[number];

export const TAB_LABELS: Record<CollectionTab, string> = {
  records: "Records",
  query: "Query",
  compare: "Compare",
};

export function isCollectionTab(value: string): value is CollectionTab {
  return (COLLECTION_TABS as readonly string[]).includes(value);
}

export function collectionPath(name: string, tab: CollectionTab = "records"): string {
  return `/c/${encodeURIComponent(name)}/${tab}`;
}

export function adjacentTab(tab: CollectionTab, delta: 1 | -1): CollectionTab {
  const i = COLLECTION_TABS.indexOf(tab);
  return COLLECTION_TABS[(i + delta + COLLECTION_TABS.length) % COLLECTION_TABS.length];
}
