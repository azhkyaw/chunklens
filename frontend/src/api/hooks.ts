import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type {
  ConnectionInput,
  CreateCollectionInput,
  ExportFile,
  QueryRequest,
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

export const useRunQuery = (name: string) =>
  useMutation({ mutationFn: (body: QueryRequest) => api.query(name, body) });

export const useConnection = () =>
  useQuery({ queryKey: ["connection"], queryFn: api.getConnection });

export const useConnectionStatus = () =>
  useQuery({ queryKey: ["connection", "status"], queryFn: () => api.testConnection() });

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
