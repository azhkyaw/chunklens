import type { MetadataKeyInfo } from "../../api/types";
import type { DocCondition, DocOperator, MetaCondition, MetaOperator, Scalar, ValueType } from "./filterModel";

const META_OPS: { op: MetaOperator; label: string }[] = [
  { op: "$eq", label: "= (eq)" }, { op: "$ne", label: "≠ (ne)" },
  { op: "$gt", label: "> (gt)" }, { op: "$gte", label: "≥ (gte)" },
  { op: "$lt", label: "< (lt)" }, { op: "$lte", label: "≤ (lte)" },
  { op: "$in", label: "in" }, { op: "$nin", label: "not in" },
];
const DOC_OPS: { op: DocOperator; label: string }[] = [
  { op: "$contains", label: "contains" }, { op: "$not_contains", label: "does not contain" },
  { op: "$regex", label: "matches regex" }, { op: "$not_regex", label: "does not match regex" },
];
const COMPARISON_OPS = new Set(["$gt", "$gte", "$lt", "$lte"]);

export function coerce(raw: string, t: ValueType): Scalar {
  if (raw === "") return "";
  if (t === "number") return Number(raw);
  if (t === "boolean") return raw === "true";
  return raw;
}
export function chromaTypeToValueType(t: string): ValueType {
  if (t === "int" || t === "float") return "number";
  if (t === "bool") return "boolean";
  return "string";
}

type Patch = Partial<MetaCondition | DocCondition>;

export function ConditionRow({
  node, keys, onChange, onRemove,
}: {
  node: MetaCondition | DocCondition;
  keys: MetadataKeyInfo[];
  onChange: (patch: Patch) => void;
  onRemove: () => void;
}) {
  if (node.lang === "where_document") {
    return (
      <div role="group" aria-label="document condition" className="condition-row">
        <select aria-label="operator" value={node.operator} onChange={(e) => onChange({ operator: e.target.value as DocOperator })}>
          {DOC_OPS.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
        </select>
        <input aria-label="text" value={node.text} onChange={(e) => onChange({ text: e.target.value })} />
        <button type="button" className="btn-sm filter-remove" aria-label="remove" onClick={onRemove}>✕</button>
      </div>
    );
  }

  const info = keys.find((k) => k.key === node.field);
  const singleKnown = info && info.types.length === 1 ? chromaTypeToValueType(info.types[0]) : undefined;
  const isArrayOp = node.operator === "$in" || node.operator === "$nin";
  const currentValueType = node.valueType;

  function setOperator(op: MetaOperator) {
    const nowArray = op === "$in" || op === "$nin";
    const patch: Patch = { operator: op };
    if (nowArray && !isArrayOp) patch.value = [];
    if (!nowArray && isArrayOp) patch.value = "";
    // Comparisons only make sense on numbers. When the key's type is not
    // locked by the sample (singleKnown), flip the row to num so the value
    // serializes as a number instead of a string. (audit L-4)
    if (COMPARISON_OPS.has(op) && currentValueType !== "number" && !singleKnown) {
      patch.valueType = "number";
      patch.value = nowArray ? [] : "";
    }
    onChange(patch);
  }
  function setField(field: string) {
    const inf = keys.find((k) => k.key === field);
    const known = inf && inf.types.length === 1 ? chromaTypeToValueType(inf.types[0]) : undefined;
    if (known) onChange({ field, valueType: known, value: isArrayOp ? [] : coerce("", known) });
    else onChange({ field });
  }

  return (
    <div role="group" aria-label="metadata condition" className="condition-row">
      <input aria-label="field" list={`meta-keys-${node.id}`} value={node.field} onChange={(e) => setField(e.target.value)} />
      <datalist id={`meta-keys-${node.id}`}>{keys.map((k) => <option key={k.key} value={k.key} />)}</datalist>
      <select aria-label="operator" value={node.operator} onChange={(e) => setOperator(e.target.value as MetaOperator)}>
        {META_OPS.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
      </select>
      {!singleKnown && (
        <select aria-label="value type" value={node.valueType}
          onChange={(e) => {
            const vt = e.target.value as ValueType;
            onChange({ valueType: vt, value: isArrayOp ? [] : coerce("", vt) });
          }}>
          <option value="string">str</option><option value="number">num</option><option value="boolean">bool</option>
        </select>
      )}
      <ValueEditor node={node} isArray={isArrayOp} onChange={onChange} />
      <button type="button" className="btn-sm filter-remove" aria-label="remove" onClick={onRemove}>✕</button>
    </div>
  );
}

function ValueEditor({ node, isArray, onChange }: { node: MetaCondition; isArray: boolean; onChange: (p: Patch) => void }) {
  if (isArray) {
    const arr = Array.isArray(node.value) ? node.value : [];
    return (
      <input aria-label="values" placeholder="comma,separated" value={arr.join(",")}
        onChange={(e) => onChange({ value: e.target.value.split(",").map((s) => coerce(s.trim(), node.valueType)) })} />
    );
  }
  if (node.valueType === "boolean") {
    return (
      <select aria-label="value" value={String(node.value === true)} onChange={(e) => onChange({ value: e.target.value === "true" })}>
        <option value="true">true</option><option value="false">false</option>
      </select>
    );
  }
  return (
    <input aria-label="value" type={node.valueType === "number" ? "number" : "text"}
      value={node.value === "" || node.value === undefined ? "" : String(node.value)}
      onChange={(e) => onChange({ value: coerce(e.target.value, node.valueType) })} />
  );
}
