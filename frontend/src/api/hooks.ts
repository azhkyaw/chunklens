import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { QueryRequest } from "./types";

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
