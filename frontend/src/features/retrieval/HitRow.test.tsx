import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { HitRow } from "./HitRow";
import type { QueryHit } from "../../api/types";

const HIT: QueryHit = { id: "doc_42", document: "Refunds are processed within 5-7 days.", metadata: { source: "policy.pdf" }, distance: 0.09 };

test("row shows rank, score, id, and snippet; clicking selects it", async () => {
  const onSelect = vi.fn();
  render(
    <ul role="listbox" aria-label="Results">
      <HitRow hit={HIT} rank={1} metric="cosine" fraction={1} selected={false} onSelect={onSelect} />
    </ul>,
  );
  expect(screen.getByText("#1")).toBeInTheDocument();
  expect(screen.getByText("0.91")).toBeInTheDocument();
  expect(screen.getByText("doc_42")).toBeInTheDocument();
  const option = screen.getByRole("option", { name: /doc_42/ });
  expect(option).toHaveAttribute("aria-selected", "false");
  await userEvent.click(screen.getByRole("button", { name: /doc_42/ }));
  expect(onSelect).toHaveBeenCalledTimes(1);
});

test("a selected row is marked aria-selected", () => {
  render(
    <ul role="listbox" aria-label="Results">
      <HitRow hit={HIT} rank={1} metric="cosine" fraction={1} selected onSelect={() => {}} />
    </ul>,
  );
  expect(screen.getByRole("option", { name: /doc_42/ })).toHaveAttribute("aria-selected", "true");
});

test("the row does not expand inline (no aria-expanded, no inline metadata)", () => {
  render(
    <ul role="listbox" aria-label="Results">
      <HitRow hit={HIT} rank={1} metric="cosine" fraction={1} selected={false} onSelect={() => {}} />
    </ul>,
  );
  expect(screen.getByRole("button", { name: /doc_42/ })).not.toHaveAttribute("aria-expanded");
  expect(screen.queryByText("source")).not.toBeInTheDocument();
});
