import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { CompareView } from "./CompareView";
import { SelectionProvider, useSelection } from "../../lib/selection";
import type { QueryResult } from "../../api/types";

const r = (...ids: string[]): QueryResult => ({ hits: ids.map((id, i) => ({ id, document: id, metadata: null, distance: i * 0.1 })) });

function Probe() {
  const { selection } = useSelection();
  if (selection?.kind !== "hit") return <output data-testid="probe">none</output>;
  return (
    <output data-testid="probe">
      {selection.hit.id}:{selection.side ?? "-"}:{String(selection.delta)}
    </output>
  );
}

function wrap(ui: React.ReactNode) {
  return (
    <SelectionProvider resetKey="docs/compare">
      {ui}
      <Probe />
    </SelectionProvider>
  );
}

test("shows both queries and tags unique hits", () => {
  render(wrap(<CompareView a={r("x", "y")} b={r("y", "z")} metric="cosine" />));
  expect(screen.getByText(/only A/i)).toBeInTheDocument();   // x
  expect(screen.getByText(/only B/i)).toBeInTheDocument();   // z
});

test("annotates a shared hit's rank movement", () => {
  // A: [x,y]  B: [y,x]  -> y moved up in B (▲1)
  render(wrap(<CompareView a={r("x", "y")} b={r("y", "x")} metric="cosine" />));
  expect(screen.getAllByText(/▲1|▼1/).length).toBeGreaterThan(0);
});

test("j moves the hit selection within side A by default", () => {
  render(wrap(<CompareView a={r("x", "y")} b={r("y", "z")} metric="cosine" />));
  fireEvent.keyDown(window, { key: "j" });
  const listA = screen.getByRole("listbox", { name: /^results a$/i });
  expect(within(listA).getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
});

test("j moves DOM focus onto the hit button in side A", () => {
  render(wrap(<CompareView a={r("x", "y")} b={r("y", "z")} metric="cosine" />));
  fireEvent.keyDown(window, { key: "j" });
  const listA = screen.getByRole("listbox", { name: /^results a$/i });
  const first = within(listA).getAllByRole("option")[0];
  expect(first).toHaveAttribute("aria-selected", "true");
  expect(within(first).getByRole("button")).toHaveFocus();
});

test("selecting a shared hit in column B carries side B and its rank delta", async () => {
  // A: [x,y]  B: [y,x]  -> y is shared, delta = aRank(2) - bRank(1) = 1
  render(wrap(<CompareView a={r("x", "y")} b={r("y", "x")} metric="cosine" />));
  const listB = screen.getByRole("listbox", { name: /^results b$/i });
  const options = within(listB).getAllByRole("button");
  await userEvent.click(options[0]); // rank #1 in B is y
  expect(screen.getByTestId("probe")).toHaveTextContent("y:B:1");
});
