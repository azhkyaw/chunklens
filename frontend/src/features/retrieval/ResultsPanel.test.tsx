import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { ResultsPanel } from "./ResultsPanel";
import type { QueryHit } from "../../api/types";

const hits: QueryHit[] = [
  { id: "a", document: "alpha", metadata: { source: "x" }, distance: 0.1 },
  { id: "b", document: "beta", metadata: { source: "y" }, distance: 0.2 },
  { id: "c", document: "gamma", metadata: { source: "x" }, distance: 0.3 },
];

test("renders a header with hit count and metric label", () => {
  render(<ResultsPanel hits={hits} metric="cosine" />);
  expect(screen.getByText(/3 hits · similarity/)).toBeInTheDocument();
});

test("empty hits shows 0 hits", () => {
  render(<ResultsPanel hits={[]} metric="l2" />);
  expect(screen.getByText(/0 hits/)).toBeInTheDocument();
});

test("group-by reorganizes hits under source headers", async () => {
  render(<ResultsPanel hits={hits} metric="cosine" keys={["source"]} />);
  await userEvent.selectOptions(screen.getByLabelText(/group by/i), "source");
  expect(screen.getByText(/source: x \(2\)/)).toBeInTheDocument();
  expect(screen.getByText(/source: y \(1\)/)).toBeInTheDocument();
});
