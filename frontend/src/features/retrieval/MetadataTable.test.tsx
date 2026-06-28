import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MetadataTable } from "./MetadataTable";

test("highlights provenance keys and linkifies URLs", () => {
  render(<MetadataTable metadata={{ source: "https://ex.com/a", section: "Refunds" }} />);
  const link = screen.getByRole("link", { name: /ex\.com/ });
  expect(link).toHaveAttribute("href", "https://ex.com/a");
  expect(screen.getByText("source").closest("tr")).toHaveAttribute("data-provenance", "true");
});

test("non-URL values render as plain text (not links)", () => {
  render(<MetadataTable metadata={{ path: "/local/file.pdf" }} />);
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.getByText("/local/file.pdf")).toBeInTheDocument();
});

test("empty metadata shows a neutral note", () => {
  render(<MetadataTable metadata={null} />);
  expect(screen.getByText(/no metadata/i)).toBeInTheDocument();
});
