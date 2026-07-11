import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { timed, setLastLatency } from "../lib/latency";
import type {
  ConnectionInput,
  CreateCollectionInput,
  EmbedderSpec,
  ExportFile,
  QueryRequest,
  QueryResult,
  ScalarMetadata,
  UpdateCollectionInput,
} from "./types";

export const useCollections = () =>
  useQuery({ queryKey: ["collections"], queryFn: api.listCollections });

export const useRecords = (name: string, limit: number, offset: number) =>
  useQuery({
    queryKey: ["records", name, limit, offset],
    queryFn: () => api.getRecords(name, limit, offset),
    enabled: Boolean(name),
  });

export const useRecord = (name: string, id: string | null) =>
  useQuery({
    queryKey: ["record", name, id],
    queryFn: () => api.getRecord(name, id as string),
    enabled: Boolean(name && id),
  });

// Client-measured latency rides along with the result; ms is a UI fact, not
// part of the API contract, so it lives here rather than in api/types.ts.
export interface TimedQueryResult extends QueryResult {
  ms: number;
}

export const useRunQuery = (name: string) =>
  useMutation({
    mutationFn: async (body: QueryRequest): Promise<TimedQueryResult> => {
      const { result, ms } = await timed(() => api.query(name, body));
      setLastLatency(ms);
      return { ...result, ms };
    },
  });

export const useConnection = () =>
  useQuery({ queryKey: ["connection"], queryFn: api.getConnection });

export const useConnectionStatus = () =>
  useQuery({
    queryKey: ["connection", "status"],
    queryFn: () => api.testConnection(),
    // Poll only while the connection is known bad, so the banner clears itself
    // when the server comes back. Two ways to be bad: the backend answered
    // "chroma is unreachable" (data.ok === false), or the check itself failed
    // (status === "error" - the chunklens backend is gone). The second case
    // needs its own test because v5 KEEPS the last successful `data` on a
    // failed refetch, so `data.ok` alone would still read true and nothing
    // would ever poll again. Healthy or in-flight schedules nothing: an
    // unconditional interval would have every consumer of this shared query
    // hammering the backend forever.
    refetchInterval: (query) =>
      query.state.status === "error" || (query.state.data && !query.state.data.ok) ? 5000 : false,
    // A health probe gets one quick second chance, then tells the truth. The
    // client-wide default (3 retries, exponential backoff) would leave the LED
    // green and the banner absent for ~7s after the backend dies.
    retry: 1,
    retryDelay: 250,
  });

export const useSaveConnection = () =>
  useMutation({ mutationFn: (body: ConnectionInput) => api.saveConnection(body) });

export const useTestConnection = () =>
  useMutation({ mutationFn: (body?: ConnectionInput) => api.testConnection(body) });

export const useCollectionDetails = (name: string | null) =>
  useQuery({
    queryKey: ["collection", name],
    queryFn: () => api.getCollectionDetails(name as string),
    enabled: Boolean(name),
  });

export const useCreateCollection = () =>
  useMutation({ mutationFn: (body: CreateCollectionInput) => api.createCollection(body) });

export const useUpdateCollection = (name: string) =>
  useMutation({ mutationFn: (body: UpdateCollectionInput) => api.updateCollection(name, body) });

export const useDeleteCollection = () =>
  useMutation({ mutationFn: (name: string) => api.deleteCollection(name) });

export const useUpdateRecordMetadata = (name: string) =>
  useMutation({
    mutationFn: (vars: { id: string; metadata: ScalarMetadata }) =>
      api.updateRecordMetadata(name, vars.id, { metadata: vars.metadata }),
  });

export const useMetadataKeys = (name: string | null) =>
  useQuery({
    queryKey: ["metadata-keys", name],
    queryFn: () => api.getMetadataKeys(name as string),
    enabled: Boolean(name),
  });

export const useImportCollection = () =>
  useMutation({
    mutationFn: (vars: { data: ExportFile; name?: string }) =>
      api.importCollection(vars.data, vars.name),
  });

export const useEmbedders = () =>
  useQuery({ queryKey: ["embedders"], queryFn: api.listEmbedders });

export const useSetEmbedderKey = () =>
  useMutation({
    mutationFn: (vars: { provider: string; token: string }) =>
      api.setEmbedderKey(vars.provider, vars.token),
  });

export const useSetCollectionEmbedder = (name: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (spec: EmbedderSpec) => api.setCollectionEmbedder(name, spec),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collection", name] }),
  });
};

export const useClearCollectionEmbedder = (name: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.clearCollectionEmbedder(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collection", name] }),
  });
};

export const useSources = (name: string, key: string | null) =>
  useQuery({
    queryKey: ["sources", name, key],
    queryFn: () => api.listSources(name, key as string),
    enabled: Boolean(name && key),
  });

export const useSourceRecords = (
  name: string, key: string, value: string, limit: number, offset: number,
) =>
  useQuery({
    queryKey: ["source-records", name, key, value, limit, offset],
    queryFn: () => api.getSourceRecords(name, key, value, limit, offset),
    enabled: Boolean(name && key && value),
  });
