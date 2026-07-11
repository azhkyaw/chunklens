import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ExportButton } from "./ExportButton";
import * as exportRun from "./exportRun";

afterEach(() => vi.restoreAllMocks());

test("Export calls runExport with the collection name and includeVectors state", async () => {
  const spy = vi.spyOn(exportRun, "runExport").mockResolvedValue(undefined);
  render(<ExportButton name="docs" />);
  await userEvent.click(screen.getByRole("button", { name: /^export$/i }));
  expect(spy).toHaveBeenCalledWith("docs", false);
});

test("checking include vectors passes true to runExport", async () => {
  const spy = vi.spyOn(exportRun, "runExport").mockResolvedValue(undefined);
  render(<ExportButton name="docs" />);
  await userEvent.click(screen.getByLabelText(/include vectors/i));
  await userEvent.click(screen.getByRole("button", { name: /^export$/i }));
  expect(spy).toHaveBeenCalledWith("docs", true);
});
