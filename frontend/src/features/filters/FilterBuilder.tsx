import type { MetadataKeyInfo } from "../../api/types";
import { FilterGroup } from "./FilterGroup";
import { addChild, removeNode, updateNode, type FilterNode, type GroupNode } from "./filterModel";
import { serialize } from "./filterSerialize";

export function FilterBuilder({
  title, lang, tree, keys, onChange,
}: {
  title: string;
  lang: "where" | "where_document";
  tree: GroupNode;
  keys: MetadataKeyInfo[];
  onChange: (next: GroupNode) => void;
}) {
  const update = (id: string, patch: Partial<FilterNode>) => onChange(updateNode(tree, id, patch) as GroupNode);
  const remove = (id: string) => onChange(removeNode(tree, id));
  const add = (groupId: string, child: FilterNode) => onChange(addChild(tree, groupId, child));

  const json = serialize(tree);
  return (
    <section className="filter-builder">
      <h4 className="filter-title">{title}</h4>
      <FilterGroup node={tree} lang={lang} keys={keys} isRoot onUpdate={update} onRemove={remove} onAdd={add} />
      <pre className="filter-json" aria-label={`${title} JSON`}>
        {json === undefined ? "(no filter)" : JSON.stringify(json)}
      </pre>
    </section>
  );
}
