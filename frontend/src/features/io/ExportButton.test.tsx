import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ExportButton } from "./ExportButton";
import { api } from "../../api/client";
import * as dl from "./download";

afterEach(() => vi.restoreAllMocks());

test("Export fetches the file and triggers a download", async () => {
  vi.spyOn(api, "exportCollection").mockResolvedValue({
    chunklens_export: 1,
    collection: { name: "docs", distance_metric: "l2", embedding_function: "none", metadata: {} },
    records: [],
  });
  const trigger = vi.spyOn(dl, "triggerDownload").mockImplementation(() => {});
  render(<ExportButton name="docs" />);
  await userEvent.click(screen.getByRole("button", { name: /^export$/i }));
  expect(api.exportCollection).toHaveBeenCalledWith("docs", false);
  await vi.waitFor(() => expect(trigger).toHaveBeenCalledWith("docs.chunklens.json", expect.any(String)));
});
