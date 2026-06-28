import type { MetadataKeyInfo } from "../../api/types";
import { ConditionRow } from "./ConditionRow";
import { newDocCondition, newGroup, newMetaCondition, type Connective, type FilterNode, type GroupNode } from "./filterModel";

export function FilterGroup({
  node, lang, keys, isRoot, onUpdate, onRemove, onAdd,
}: {
  node: GroupNode;
  lang: "where" | "where_document";
  keys: MetadataKeyInfo[];
  isRoot?: boolean;
  onUpdate: (id: string, patch: Partial<FilterNode>) => void;
  onRemove: (id: string) => void;
  onAdd: (groupId: string, child: FilterNode) => void;
}) {
  const addCondition = () => onAdd(node.id, lang === "where" ? newMetaCondition() : newDocCondition());
  const addGroup = () => onAdd(node.id, newGroup());

  return (
    <div style={{ border: "1px solid #ccc", padding: 8, marginTop: 6 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <select aria-label="match" value={node.connective} onChange={(e) => onUpdate(node.id, { connective: e.target.value as Connective })}>
          <option value="$and">Match ALL (AND)</option>
          <option value="$or">Match ANY (OR)</option>
        </select>
        <span>of:</span>
        <button type="button" onClick={addCondition}>+ Add condition</button>
        <button type="button" onClick={addGroup}>+ Add group</button>
        {!isRoot && <button type="button" aria-label="remove group" onClick={() => onRemove(node.id)}>✕</button>}
      </div>
      <div style={{ paddingLeft: 16 }}>
        {node.children.map((child) =>
          child.kind === "group" ? (
            <FilterGroup key={child.id} node={child} lang={lang} keys={keys} onUpdate={onUpdate} onRemove={onRemove} onAdd={onAdd} />
          ) : (
            <ConditionRow key={child.id} node={child} keys={keys} onChange={(patch) => onUpdate(child.id, patch)} onRemove={() => onRemove(child.id)} />
          ),
        )}
      </div>
    </div>
  );
}
