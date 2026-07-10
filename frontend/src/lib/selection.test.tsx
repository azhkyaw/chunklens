import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { SelectionProvider, useSelection, type Selection } from "./selection";

const REC: Selection = {
  kind: "record",
  record: { id: "r1", document: "doc", metadata: null },
};

function Probe() {
  const { selection, select } = useSelection();
  return (
    <div>
      <output data-testid="current">
        {selection?.kind === "record" ? selection.record.id : "none"}
      </output>
      <button type="button" onClick={() => select(REC)}>pick</button>
      <button type="button" onClick={() => select(null)}>clear</button>
    </div>
  );
}

test("select stores a selection and select(null) clears it", async () => {
  render(
    <SelectionProvider resetKey="docs/records">
      <Probe />
    </SelectionProvider>,
  );
  expect(screen.getByTestId("current")).toHaveTextContent("none");
  await userEvent.click(screen.getByRole("button", { name: "pick" }));
  expect(screen.getByTestId("current")).toHaveTextContent("r1");
  await userEvent.click(screen.getByRole("button", { name: "clear" }));
  expect(screen.getByTestId("current")).toHaveTextContent("none");
});

test("changing resetKey clears the selection without remounting children", async () => {
  const { rerender } = render(
    <SelectionProvider resetKey="docs/records">
      <Probe />
    </SelectionProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "pick" }));
  expect(screen.getByTestId("current")).toHaveTextContent("r1");
  rerender(
    <SelectionProvider resetKey="docs/query">
      <Probe />
    </SelectionProvider>,
  );
  expect(screen.getByTestId("current")).toHaveTextContent("none");
});

test("useSelection outside a provider throws", () => {
  // Silence React's error boundary noise for the expected throw.
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<Probe />)).toThrow(/SelectionProvider/);
  spy.mockRestore();
});
