import type { CollectionDetails } from "../../api/types";

export const DEFAULT_EF_DIM = 384; // Chroma's default embedder (all-MiniLM-L6-v2) output dim

export interface Guard { level: "block" | "warn"; message: string; }
export interface GuardInput {
  details?: CollectionDetails;
  mode?: "text" | "vector";
  text: string;
  hasEmbedding: boolean;
  // True when a surfaced provider embedder will embed the query text for this
  // collection - suppresses the default-EF "won't match" warn (text is embedded
  // with the provider, at the collection's own dimensionality).
  providerDetected?: boolean;
}

export function defaultQueryMode(details?: CollectionDetails, providerIds?: string[]): "text" | "vector" {
  if (!details) return "text";
  if (details.embedding_function === "none") return "vector";
  // A surfaced provider EF: ChunkLens embeds the query text for it -> text mode.
  if (providerIds?.includes(details.embedding_function)) return "text";
  // An EF we can't embed for (unknown/custom) with a non-default dim -> paste a raw vector.
  if (details.dimensionality != null && details.dimensionality !== DEFAULT_EF_DIM) return "vector";
  return "text";
}

export function evaluateGuards(input: GuardInput): Guard[] {
  const guards: Guard[] = [];
  const { details, mode, text, hasEmbedding, providerDetected } = input;

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
    !providerDetected &&
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
