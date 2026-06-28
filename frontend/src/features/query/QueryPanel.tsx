import { useState } from "react";
import { SingleQuery } from "./SingleQuery";
import { CompareQuery } from "./CompareQuery";

export function QueryPanel({ name }: { name: string }) {
  const [mode, setMode] = useState<"single" | "compare">("single");
  return (
    <section style={{ marginTop: 16 }}>
      <h3>Query</h3>
      <div role="tablist" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button role="tab" aria-selected={mode === "single"} onClick={() => setMode("single")}>Single</button>
        <button role="tab" aria-selected={mode === "compare"} onClick={() => setMode("compare")}>Compare</button>
      </div>
      {mode === "single" ? <SingleQuery name={name} /> : <CompareQuery name={name} />}
    </section>
  );
}
