import { newGroup, type GroupNode } from "../filters/filterModel";
import { serialize, validate, type FilterError } from "../filters/filterSerialize";
import type { CollectionDetails, EmbedderSpec, QueryRequest } from "../../api/types";

export interface QuerySpec {
  mode: "text" | "vector";
  text: string;
  vector: string;
  embedder: EmbedderSpec | null;
  // true once the user explicitly picked "- none -"; distinguishes "cleared
  // on purpose" from "not chosen yet" so the prefill effect stops re-applying
  // the hint after its own invalidation refetch.
  embedderCleared: boolean;
  nResults: number;
  whereTree: GroupNode;
  docTree: GroupNode;
}

export function newQuerySpec(): QuerySpec {
  return { mode: "text", text: "", vector: "", embedder: null, embedderCleared: false, nResults: 10, whereTree: newGroup(), docTree: newGroup() };
}

export function parseVector(raw: string): { vector?: number[]; error?: string } {
  const t = raw.trim();
  if (!t) return { error: "Enter a query vector." };
  let nums: number[];
  try {
    const p = JSON.parse(t);
    if (!Array.isArray(p)) throw new Error();
    nums = p.map(Number);
  } catch {
    nums = t.replace(/^\[/, "").replace(/\]$/, "").split(/[\s,]+/).filter(Boolean).map(Number);
  }
  if (nums.length === 0 || nums.some((n) => !Number.isFinite(n))) {
    return { error: "Couldn't parse a numeric vector." };
  }
  return { vector: nums };
}

export function vectorError(spec: QuerySpec, details?: CollectionDetails): string | null {
  if (spec.mode !== "vector") return null;
  const { vector, error } = parseVector(spec.vector);
  if (error) return error;
  const dim = details?.dimensionality;
  if (dim != null && vector!.length !== dim) return `Expected ${dim} numbers, got ${vector!.length}.`;
  return null;
}

export function serializeSpec(spec: QuerySpec): QueryRequest {
  const base = {
    n_results: spec.nResults,
    where: serialize(spec.whereTree) as Record<string, unknown> | undefined,
    where_document: serialize(spec.docTree) as Record<string, unknown> | undefined,
  };
  if (spec.mode === "vector") {
    return { ...base, query_embedding: parseVector(spec.vector).vector };
  }
  return { ...base, query_text: spec.text, ...(spec.embedder ? { embedder: spec.embedder } : {}) };
}

export function specErrors(spec: QuerySpec): FilterError[] {
  return [...validate(spec.whereTree), ...validate(spec.docTree)];
}
