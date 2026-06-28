import { newGroup, type GroupNode } from "../filters/filterModel";
import { serialize, validate, type FilterError } from "../filters/filterSerialize";
import type { QueryRequest } from "../../api/types";

export interface QuerySpec {
  text: string;
  nResults: number;
  whereTree: GroupNode;
  docTree: GroupNode;
}

export function newQuerySpec(): QuerySpec {
  return { text: "", nResults: 10, whereTree: newGroup(), docTree: newGroup() };
}

export function serializeSpec(spec: QuerySpec): QueryRequest {
  return {
    query_text: spec.text,
    n_results: spec.nResults,
    where: serialize(spec.whereTree) as Record<string, unknown> | undefined,
    where_document: serialize(spec.docTree) as Record<string, unknown> | undefined,
  };
}

export function specErrors(spec: QuerySpec): FilterError[] {
  return [...validate(spec.whereTree), ...validate(spec.docTree)];
}
