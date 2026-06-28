import type { FilterNode } from "./filterModel";

export interface FilterError {
  id: string;
  message: string;
}

export function serialize(node: FilterNode): unknown | undefined {
  if (node.kind === "group") {
    const parts = node.children.map(serialize).filter((p) => p !== undefined);
    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return { [node.connective]: parts };
  }
  if (node.lang === "where") {
    if (node.field === "") return undefined;
    return { [node.field]: { [node.operator]: node.value } };
  }
  if (node.text === "") return undefined;
  return { [node.operator]: node.text };
}

const COMPARISON = ["$gt", "$gte", "$lt", "$lte"];

export function validate(node: FilterNode): FilterError[] {
  const errors: FilterError[] = [];
  walk(node, errors);
  return errors;
}

function walk(node: FilterNode, errors: FilterError[]): void {
  if (node.kind === "group") {
    node.children.forEach((c) => walk(c, errors));
    return;
  }
  if (node.lang === "where") {
    if (!node.field) errors.push({ id: node.id, message: "field required" });
    if (node.operator === "$in" || node.operator === "$nin") {
      if (!Array.isArray(node.value) || node.value.length === 0) {
        errors.push({ id: node.id, message: "add at least one value" });
      }
    } else if (node.value === "" || node.value === undefined) {
      errors.push({ id: node.id, message: "value required" });
    } else if (
      COMPARISON.includes(node.operator) &&
      typeof node.value === "string" &&
      Number.isNaN(Number(node.value))
    ) {
      errors.push({ id: node.id, message: "expects a number" });
    }
    return;
  }
  if (!node.text) {
    errors.push({ id: node.id, message: "text required" });
  } else if (node.operator === "$regex" || node.operator === "$not_regex") {
    try {
      // eslint-disable-next-line no-new
      new RegExp(node.text);
    } catch {
      errors.push({ id: node.id, message: "invalid regular expression" });
    }
  }
}
