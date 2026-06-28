import type { ScalarMetadata } from "../../api/types";

export function parseScalarMetadata(text: string): ScalarMetadata {
  const trimmed = text.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object");
  }
  for (const [key, val] of Object.entries(parsed)) {
    if (!["string", "number", "boolean"].includes(typeof val)) {
      throw new Error(`Value for "${key}" must be a string, number, or boolean`);
    }
  }
  return parsed as ScalarMetadata;
}

export function MetadataEditor({
  value,
  onChange,
  label = "Metadata (JSON)",
}: {
  value: string;
  onChange: (text: string) => void;
  label?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{ width: "100%", fontFamily: "monospace" }}
      />
    </label>
  );
}
