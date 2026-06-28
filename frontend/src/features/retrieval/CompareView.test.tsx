import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { CompareView } from "./CompareView";
import type { QueryResult } from "../../api/types";

const r = (...ids: string[]): QueryResult => ({ hits: ids.map((id, i) => ({ id, document: id, metadata: null, distance: i * 0.1 })) });

test("shows both queries and tags unique hits", () => {
  render(<CompareView a={r("x", "y")} b={r("y", "z")} metric="cosine" />);
  expect(screen.getByText(/only A/i)).toBeInTheDocument();   // x
  expect(screen.getByText(/only B/i)).toBeInTheDocument();   // z
});

test("annotates a shared hit's rank movement", () => {
  // A: [x,y]  B: [y,x]  -> y moved up in B (▲1)
  render(<CompareView a={r("x", "y")} b={r("y", "x")} metric="cosine" />);
  expect(screen.getAllByText(/▲1|▼1/).length).toBeGreaterThan(0);
});
