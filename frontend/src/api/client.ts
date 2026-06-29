import type {
  CollectionDetails,
  CollectionSummary,
  ConnectionInfo,
  ConnectionInput,
  ConnectionTestResult,
  CreateCollectionInput,
  EmbedderInfo,
  EmbedderSpec,
  ExportFile,
  MetadataKeysResponse,
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
  getMetadataKeys: (name: string) =>
    jsonFetch<MetadataKeysResponse>(`/api/collections/${encodeURIComponent(name)}/metadata-keys`),
  exportCollection: (name: string, includeEmbeddings: boolean) =>
    jsonFetch<ExportFile>(
      `/api/collections/${encodeURIComponent(name)}/export?include_embeddings=${includeEmbeddings}`,
    ),
  importCollection: (data: ExportFile, name?: string) =>
    jsonFetch<CollectionDetails>(
      `/api/collections/import${name ? `?name=${encodeURIComponent(name)}` : ""}`,
      { method: "POST", body: JSON.stringify(data) },
    ),
  listEmbedders: () => jsonFetch<EmbedderInfo[]>("/api/embedders"),
  setEmbedderKey: (provider: string, token: string) =>
    jsonFetch<void>(`/api/embedders/${encodeURIComponent(provider)}/key`, {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  setCollectionEmbedder: (name: string, spec: EmbedderSpec) =>
    jsonFetch<void>(`/api/collections/${encodeURIComponent(name)}/embedder`, {
      method: "PUT",
      body: JSON.stringify(spec),
    }),
  clearCollectionEmbedder: (name: string) =>
    jsonFetch<void>(`/api/collections/${encodeURIComponent(name)}/embedder`, { method: "DELETE" }),
};
