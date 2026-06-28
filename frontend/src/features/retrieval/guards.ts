import type { CollectionDetails } from "../../api/types";

export interface Guard { level: "block" | "warn"; message: string; }
export interface GuardInput { details?: CollectionDetails; text: string; hasEmbedding: boolean; }

export function evaluateGuards(input: GuardInput): Guard[] {
  const guards: Guard[] = [];
  if (input.details?.embedding_function === "none" && input.text.trim() !== "" && !input.hasEmbedding) {
    guards.push({
      level: "block",
      message:
        "This collection has no embedding function, so text can't be embedded into a vector. " +
        "Provide a raw query vector, or query a collection that has an embedding function.",
    });
  }
  return guards;
}
