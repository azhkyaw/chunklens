import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { HitRow } from "./HitRow";
import type { QueryHit } from "../../api/types";

const HIT: QueryHit = { id: "doc_42", document: "Refunds are processed within 5-7 days.", metadata: { source: "policy.pdf" }, distance: 0.09 };

test("collapsed row shows rank, score and id; expands to full doc + metadata", async () => {
  render(<HitRow hit={HIT} rank={1} metric="cosine" fraction={1} />);
  expect(screen.getByText("#1")).toBeInTheDocument();
  expect(screen.getByText("0.91")).toBeInTheDocument();
  expect(screen.getByText("doc_42")).toBeInTheDocument();
  const toggle = screen.getByRole("button", { name: /doc_42/ });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  // metadata renders ONLY when expanded, so "source" proves the row opened
  // (don't assert the document text - it also appears in the collapsed snippet)
  expect(screen.getByText("source")).toBeInTheDocument();
});
