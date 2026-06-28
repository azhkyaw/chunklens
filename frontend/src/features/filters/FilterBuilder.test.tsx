import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { FilterBuilder } from "./FilterBuilder";
import { newGroup } from "./filterModel";

test("adding a condition calls onChange with the grown tree", async () => {
  const onChange = vi.fn();
  render(<FilterBuilder title="Metadata filter" lang="where" tree={newGroup()} keys={[]} onChange={onChange} />);
  await userEvent.click(screen.getByRole("button", { name: /add condition/i }));
  const next = onChange.mock.calls[0][0];
  expect(next.children).toHaveLength(1);
});

test("shows (no filter) for an empty tree", () => {
  render(<FilterBuilder title="Metadata filter" lang="where" tree={newGroup()} keys={[]} onChange={() => {}} />);
  expect(screen.getByText(/no filter/i)).toBeInTheDocument();
});
