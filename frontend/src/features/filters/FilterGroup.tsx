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
    <div className="filter-group">
      <div className="filter-group-head">
        <select aria-label="match" className="connective" value={node.connective} onChange={(e) => onUpdate(node.id, { connective: e.target.value as Connective })}>
          <option value="$and">Match ALL (AND)</option>
          <option value="$or">Match ANY (OR)</option>
        </select>
        <span className="faint">of:</span>
        <button type="button" className="btn-sm" onClick={addCondition}>+ Add condition</button>
        <button type="button" className="btn-sm" onClick={addGroup}>+ Add group</button>
        {!isRoot && <button type="button" className="btn-sm filter-remove" aria-label="remove group" onClick={() => onRemove(node.id)}>✕</button>}
      </div>
      {node.children.length > 0 && (
        <div className="filter-children">
          {node.children.map((child) =>
            child.kind === "group" ? (
              <FilterGroup key={child.id} node={child} lang={lang} keys={keys} onUpdate={onUpdate} onRemove={onRemove} onAdd={onAdd} />
            ) : (
              <ConditionRow key={child.id} node={child} keys={keys} onChange={(patch) => onUpdate(child.id, patch)} onRemove={() => onRemove(child.id)} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
