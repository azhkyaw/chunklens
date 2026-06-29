import type { CollectionDetails } from "../../api/types";

export const DEFAULT_EF_DIM = 384; // Chroma's default embedder (all-MiniLM-L6-v2) output dim

export interface Guard { level: "block" | "warn"; message: string; }
export interface GuardInput {
  details?: CollectionDetails;
  mode?: "text" | "vector"; // optional: existing SingleQuery/CompareQuery callers keep compiling
  text: string;             // until Task 6 wires `mode` in; the warn stays dormant when omitted
  hasEmbedding: boolean;
}

export function defaultQueryMode(details?: CollectionDetails): "text" | "vector" {
  if (!details) return "text";
  if (details.embedding_function === "none") return "vector";
  if (details.dimensionality != null && details.dimensionality !== DEFAULT_EF_DIM) return "vector";
  return "text";
}

export function evaluateGuards(input: GuardInput): Guard[] {
  const guards: Guard[] = [];
  const { details, mode, text, hasEmbedding } = input;

  if (mode === "text" && details?.embedding_function === "none" && text.trim() !== "" && !hasEmbedding) {
    guards.push({
      level: "block",
      message:
        "This collection has no embedding function, so text can't be embedded into a vector. " +
        "Switch to Vector mode and paste a raw query vector.",
    });
  }

  if (
    mode === "text" && details && details.embedding_function !== "none" &&
    details.dimensionality != null && details.dimensionality !== DEFAULT_EF_DIM
  ) {
    guards.push({
      level: "warn",
      message:
        `This collection is ${details.dimensionality}-dim, but text queries here are embedded with ` +
        `the default ${DEFAULT_EF_DIM}-dim model - they likely won't match. Switch to Vector and ` +
        `paste a ${details.dimensionality}-dim vector.`,
    });
  }

  return guards;
}
