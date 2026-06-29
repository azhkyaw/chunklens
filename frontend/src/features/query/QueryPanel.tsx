import { useState } from "react";
import { SingleQuery } from "./SingleQuery";
import { CompareQuery } from "./CompareQuery";

export function QueryPanel({ name }: { name: string }) {
  const [mode, setMode] = useState<"single" | "compare">("single");
  return (
    <section className="query-console">
      <div className="console-head">
        <h3>Query</h3>
        <div role="tablist" className="tabs">
          <button role="tab" className="tab" aria-selected={mode === "single"} onClick={() => setMode("single")}>Single</button>
          <button role="tab" className="tab" aria-selected={mode === "compare"} onClick={() => setMode("compare")}>Compare</button>
        </div>
      </div>
      {mode === "single" ? <SingleQuery name={name} /> : <CompareQuery name={name} />}
    </section>
  );
}
