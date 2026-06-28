export interface CollectionSummary { name: string; count: number; }
export interface RecordRow {
  id: string;
  document: string | null;
  metadata: Record<string, unknown> | null;
}
export interface RecordsPage {
  items: RecordRow[];
  limit: number;
  offset: number;
  total: number;
}
export interface QueryHit {
  id: string;
  document: string | null;
  metadata: Record<string, unknown> | null;
  distance: number;
}
export interface QueryResult { hits: QueryHit[]; }
export interface QueryRequest {
  query_text?: string;
  query_embedding?: number[];
  n_results?: number;
  where?: Record<string, unknown>;
  where_document?: Record<string, unknown>;
}
export interface ConnectionInfo {
  host: string;
  port: number;
  ssl: boolean;
  tenant: string;
  database: string;
  auth_mode: "none" | "token";
  has_token: boolean;
}
export interface ConnectionInput {
  host: string;
  port: number;
  ssl: boolean;
  tenant: string;
  database: string;
  auth_mode: "none" | "token";
  token?: string;
}
export interface ConnectionTestResult {
  ok: boolean;
  error?: string | null;
  heartbeat_ns?: number | null;
}
export type DistanceMetric = "l2" | "cosine" | "ip";
export type ScalarMetadata = Record<string, string | number | boolean>;

export interface CreateCollectionInput {
  name: string;
  distance_metric: DistanceMetric;
  embedding_function: "default" | "none";
  metadata?: ScalarMetadata | null;
}
export interface CollectionDetails {
  name: string;
  count: number;
  dimensionality: number | null;
  distance_metric: string;
  embedding_function: string;
  metadata: Record<string, unknown>;
}
export interface UpdateCollectionInput {
  name?: string;
  metadata?: ScalarMetadata | null;
}
export interface UpdateRecordMetadataInput {
  metadata: ScalarMetadata;
}
export interface MetadataKeyInfo {
  key: string;
  types: string[];
}
export interface MetadataKeysResponse {
  keys: MetadataKeyInfo[];
  sampled: number;
  total: number;
}
