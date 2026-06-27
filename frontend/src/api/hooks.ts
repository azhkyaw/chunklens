import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { ConnectionInput, QueryRequest } from "./types";

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
