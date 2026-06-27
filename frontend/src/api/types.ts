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
