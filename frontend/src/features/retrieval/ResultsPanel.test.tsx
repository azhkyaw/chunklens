import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { ResultsPanel } from "./ResultsPanel";
import { SelectionProvider, useSelection } from "../../lib/selection";
import type { QueryHit } from "../../api/types";

const hits: QueryHit[] = [
  { id: "a", document: "alpha", metadata: { source: "x" }, distance: 0.1 },
  { id: "b", document: "beta", metadata: { source: "y" }, distance: 0.2 },
  { id: "c", document: "gamma", metadata: { source: "x" }, distance: 0.3 },
];

function Probe() {
  const { selection } = useSelection();
  if (selection?.kind !== "hit") return <output data-testid="probe">none</output>;
  return (
    <output data-testid="probe">
      {selection.hit.id}:{selection.rank}:{selection.side ?? "-"}:{String(selection.delta)}
    </output>
  );
}

function wrap(ui: React.ReactNode) {
  return (
    <SelectionProvider resetKey="docs/query">
      {ui}
      <Probe />
    </SelectionProvider>
  );
}

test("renders a header with hit count and metric label", () => {
  render(wrap(<ResultsPanel hits={hits} metric="cosine" />));
  expect(screen.getByText(/3 hits · similarity/)).toBeInTheDocument();
});

test("empty hits shows 0 hits", () => {
  render(wrap(<ResultsPanel hits={[]} metric="l2" />));
  expect(screen.getByText(/0 hits/)).toBeInTheDocument();
});

test("group-by reorganizes hits under source headers", async () => {
  render(wrap(<ResultsPanel hits={hits} metric="cosine" keys={["source"]} />));
  await userEvent.selectOptions(screen.getByLabelText(/group by/i), "source");
  expect(screen.getByText(/source: x \(2\)/)).toBeInTheDocument();
  expect(screen.getByText(/source: y \(1\)/)).toBeInTheDocument();
});

test("clicking a hit selects it with rank, metric, side, and delta", async () => {
  const deltas = new Map<string, number | null>([["b", 1]]);
  render(wrap(<ResultsPanel hits={hits} metric="cosine" side="B" deltas={deltas} />));
  await userEvent.click(screen.getByRole("button", { name: /beta/ }));
  expect(screen.getByTestId("probe")).toHaveTextContent("b:2:B:1");
  expect(screen.getByRole("option", { name: /beta/ })).toHaveAttribute("aria-selected", "true");
});
