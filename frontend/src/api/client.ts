import type {
  CollectionSummary,
  QueryRequest,
  QueryResult,
  RecordsPage,
} from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export const api = {
  listCollections: () => jsonFetch<CollectionSummary[]>("/api/collections"),
  getRecords: (name: string, limit: number, offset: number) =>
    jsonFetch<RecordsPage>(
      `/api/collections/${encodeURIComponent(name)}/records?limit=${limit}&offset=${offset}`,
    ),
  query: (name: string, body: QueryRequest) =>
    jsonFetch<QueryResult>(`/api/collections/${encodeURIComponent(name)}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
