import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { FilterGroup } from "./FilterGroup";
import { newGroup } from "./filterModel";

test("add condition calls onAdd with a metadata leaf", async () => {
  const onAdd = vi.fn();
  render(<FilterGroup node={newGroup()} lang="where" keys={[]} isRoot onUpdate={() => {}} onRemove={() => {}} onAdd={onAdd} />);
  await userEvent.click(screen.getByRole("button", { name: /add condition/i }));
  expect(onAdd).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ kind: "condition", lang: "where" }));
});

test("add group calls onAdd with a group node", async () => {
  const onAdd = vi.fn();
  render(<FilterGroup node={newGroup()} lang="where" keys={[]} isRoot onUpdate={() => {}} onRemove={() => {}} onAdd={onAdd} />);
  await userEvent.click(screen.getByRole("button", { name: /add group/i }));
  expect(onAdd).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ kind: "group" }));
});

test("changing the connective calls onUpdate", async () => {
  const onUpdate = vi.fn();
  render(<FilterGroup node={newGroup()} lang="where" keys={[]} isRoot onUpdate={onUpdate} onRemove={() => {}} onAdd={() => {}} />);
  await userEvent.selectOptions(screen.getByLabelText(/match/i), "$or");
  expect(onUpdate).toHaveBeenCalledWith(expect.any(String), { connective: "$or" });
});
