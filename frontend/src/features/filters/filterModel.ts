export type Connective = "$and" | "$or";
export type Scalar = string | number | boolean;
export type ValueType = "string" | "number" | "boolean";
export type MetaOperator = "$eq" | "$ne" | "$gt" | "$gte" | "$lt" | "$lte" | "$in" | "$nin";
export type DocOperator = "$contains" | "$not_contains" | "$regex" | "$not_regex";

export interface GroupNode {
  id: string;
  kind: "group";
  connective: Connective;
  children: FilterNode[];
}
export interface MetaCondition {
  id: string;
  kind: "condition";
  lang: "where";
  field: string;
  operator: MetaOperator;
  value: Scalar | Scalar[];
  valueType: ValueType;
}
export interface DocCondition {
  id: string;
  kind: "condition";
  lang: "where_document";
  operator: DocOperator;
  text: string;
}
export type FilterNode = GroupNode | MetaCondition | DocCondition;

let _counter = 0;
function nextId(): string {
  _counter += 1;
  return `n${_counter}`;
}

export function newGroup(connective: Connective = "$and", children: FilterNode[] = []): GroupNode {
  return { id: nextId(), kind: "group", connective, children };
}
export function newMetaCondition(): MetaCondition {
  return { id: nextId(), kind: "condition", lang: "where", field: "", operator: "$eq", value: "", valueType: "string" };
}
export function newDocCondition(): DocCondition {
  return { id: nextId(), kind: "condition", lang: "where_document", operator: "$contains", text: "" };
}

export function updateNode(node: FilterNode, id: string, patch: Partial<FilterNode>): FilterNode {
  if (node.id === id) return { ...node, ...patch } as FilterNode;
  if (node.kind === "group") {
    return { ...node, children: node.children.map((c) => updateNode(c, id, patch)) };
  }
  return node;
}
export function removeNode(node: GroupNode, id: string): GroupNode {
  return {
    ...node,
    children: node.children
      .filter((c) => c.id !== id)
      .map((c) => (c.kind === "group" ? removeNode(c, id) : c)),
  };
}
export function addChild(node: GroupNode, groupId: string, child: FilterNode): GroupNode {
  if (node.id === groupId) return { ...node, children: [...node.children, child] };
  return {
    ...node,
    children: node.children.map((c) => (c.kind === "group" ? addChild(c, groupId, child) : c)),
  };
}
