import { expect, test, vi } from "vitest";
import { api } from "../../api/client";
import { toastError, toastSuccess } from "../../ui/toast";
import { triggerDownload } from "./download";
import { runExport } from "./exportRun";

vi.mock("../../ui/toast", () => ({
  AppToaster: () => null,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("./download", () => ({
  serializeExport: vi.fn(() => "{}"),
  triggerDownload: vi.fn(),
}));

test("runExport downloads the file and toasts success", async () => {
  const data = { collection: { name: "demo" }, records: [] };
  vi.spyOn(api, "exportCollection").mockResolvedValue(data as never);
  await runExport("demo", false);
  expect(api.exportCollection).toHaveBeenCalledWith("demo", false);
  expect(triggerDownload).toHaveBeenCalledWith("demo.chunklens.json", "{}");
  expect(toastSuccess).toHaveBeenCalledWith("Exported demo");
});

test("runExport toasts the failure message", async () => {
  vi.spyOn(api, "exportCollection").mockRejectedValue(new Error("nope"));
  await runExport("demo", true);
  expect(toastError).toHaveBeenCalledWith("Export failed - nope");
});
