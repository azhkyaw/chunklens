import type {
  CollectionDetails,
  CollectionSummary,
  ConnectionInfo,
  ConnectionInput,
  ConnectionTestResult,
  CreateCollectionInput,
  QueryRequest,
  QueryResult,
  RecordRow,
  RecordsPage,
  UpdateCollectionInput,
  UpdateRecordMetadataInput,
} from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
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
  getConnection: () => jsonFetch<ConnectionInfo>("/api/connection"),
  saveConnection: (body: ConnectionInput) =>
    jsonFetch<ConnectionInfo>("/api/connection", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  testConnection: (body?: ConnectionInput) =>
    jsonFetch<ConnectionTestResult>("/api/connection/test", {
      method: "POST",
      body: JSON.stringify(body ?? null),
    }),
  createCollection: (body: CreateCollectionInput) =>
    jsonFetch<CollectionDetails>("/api/collections", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getCollectionDetails: (name: string) =>
    jsonFetch<CollectionDetails>(`/api/collections/${encodeURIComponent(name)}`),
  updateCollection: (name: string, body: UpdateCollectionInput) =>
    jsonFetch<CollectionDetails>(`/api/collections/${encodeURIComponent(name)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteCollection: (name: string) =>
    jsonFetch<void>(`/api/collections/${encodeURIComponent(name)}`, { method: "DELETE" }),
  updateRecordMetadata: (name: string, id: string, body: UpdateRecordMetadataInput) =>
    jsonFetch<RecordRow>(
      `/api/collections/${encodeURIComponent(name)}/records/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
};
