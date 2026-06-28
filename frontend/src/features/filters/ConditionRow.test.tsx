import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ConditionRow } from "./ConditionRow";
import { newMetaCondition, newDocCondition } from "./filterModel";

test("switching operator to $in emits an array value", async () => {
  const onChange = vi.fn();
  render(<ConditionRow node={{ ...newMetaCondition(), field: "tag" }} keys={[]} onChange={onChange} onRemove={() => {}} />);
  await userEvent.selectOptions(screen.getByLabelText(/operator/i), "$in");
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: "$in", value: [] }));
});

test("a bool-typed field renders a true/false value select", () => {
  const node = { ...newMetaCondition(), field: "ok", valueType: "boolean" as const, value: true };
  render(<ConditionRow node={node} keys={[{ key: "ok", types: ["bool"] }]} onChange={() => {}} onRemove={() => {}} />);
  const value = screen.getByLabelText(/^value$/i) as HTMLSelectElement;
  expect(value.tagName).toBe("SELECT");
  expect(within(value).getByRole("option", { name: "true" })).toBeInTheDocument();
});

test("document leaf shows operator + text", async () => {
  const onChange = vi.fn();
  render(<ConditionRow node={newDocCondition()} keys={[]} onChange={onChange} onRemove={() => {}} />);
  await userEvent.type(screen.getByLabelText(/^text$/i), "fox");
  expect(onChange).toHaveBeenCalled();
});
