import type { CollectionDetails } from "../../api/types";

export const DEFAULT_EF_DIM = 384; // Chroma's default embedder (all-MiniLM-L6-v2) output dim

export interface Guard { level: "block" | "warn"; message: string; }
export interface GuardInput {
  details?: CollectionDetails;
  mode?: "text" | "vector";
  text: string;
  hasEmbedding: boolean;
  // True when an embedder (auto-detected OR manually picked) will embed the query
  // text for this collection - unblocks text on a none-EF collection and suppresses
  // the default-EF "won't match" warn.
  embedderSelected?: boolean;
}

// Show the manual embedder picker for any non-default collection - i.e. NOT a plain
// `default` collection (default EF with the 384 default dim, or an empty/unknown dim).
export function showsEmbedderPicker(details?: CollectionDetails): boolean {
  if (!details) return false;
  if (details.embedding_function !== "default") return true;
  return details.dimensionality != null && details.dimensionality !== DEFAULT_EF_DIM;
}

export function defaultQueryMode(
  details?: CollectionDetails, providerIds?: string[], hasHint?: boolean,
): "text" | "vector" {
  if (!details) return "text";
  if (hasHint) return "text"; // a saved embedder hint -> embed query text
  if (details.embedding_function === "none") return "vector";
  // A surfaced provider EF: ChunkLens embeds the query text for it -> text mode.
  if (providerIds?.includes(details.embedding_function)) return "text";
  // An EF we can't embed for (unknown/custom) with a non-default dim -> paste a raw vector.
  if (details.dimensionality != null && details.dimensionality !== DEFAULT_EF_DIM) return "vector";
  return "text";
}

export function evaluateGuards(input: GuardInput): Guard[] {
  const guards: Guard[] = [];
  const { details, mode, text, hasEmbedding, embedderSelected } = input;

  if (
    mode === "text" && details?.embedding_function === "none" &&
    text.trim() !== "" && !hasEmbedding && !embedderSelected
  ) {
    guards.push({
      level: "block",
      message:
        "This collection has no embedding function, so typed text can't be embedded. " +
        "Pick an embedder above, or switch to Vector mode and paste a raw query vector.",
    });
  }

  if (
    mode === "text" && details && details.embedding_function !== "none" &&
    !embedderSelected &&
    details.dimensionality != null && details.dimensionality !== DEFAULT_EF_DIM
  ) {
    guards.push({
      level: "warn",
      message:
        `This collection is ${details.dimensionality}-dim, but text queries here are embedded with ` +
        `the default ${DEFAULT_EF_DIM}-dim model - they likely won't match. Pick an embedder above, ` +
        `or switch to Vector and paste a ${details.dimensionality}-dim vector.`,
    });
  }

  return guards;
}
