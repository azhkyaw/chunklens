import { afterEach, expect, test, vi } from "vitest";
import { copyText } from "./copy";
import { toastError, toastSuccess } from "../ui/toast";

vi.mock("../ui/toast", () => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

function stubClipboard(writeText: ((t: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    value: writeText ? { writeText } : undefined,
    configurable: true,
  });
}

test("copies the text and toasts a labeled confirmation", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  stubClipboard(writeText);
  await copyText("print(1)", "Python snippet");
  expect(writeText).toHaveBeenCalledWith("print(1)");
  expect(toastSuccess).toHaveBeenCalledWith("Python snippet copied");
});

test("a clipboard rejection toasts an error instead of throwing", async () => {
  stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
  await copyText("x", "JSON");
  expect(toastError).toHaveBeenCalledWith("Copy failed - clipboard unavailable");
  expect(toastSuccess).not.toHaveBeenCalled();
});

test("a missing clipboard API toasts an error instead of throwing", async () => {
  stubClipboard(undefined);
  await copyText("x", "JSON");
  expect(toastError).toHaveBeenCalledWith("Copy failed - clipboard unavailable");
});
