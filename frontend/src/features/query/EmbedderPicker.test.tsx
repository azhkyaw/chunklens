import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { EmbedderPicker } from "./EmbedderPicker";
import { newQuerySpec, type QuerySpec } from "./querySpec";
import { api } from "../../api/client";
import type { CollectionDetails, EmbedderInfo } from "../../api/types";
import { toastError, toastSuccess } from "../../ui/toast";

vi.mock("../../ui/toast", () => ({
  AppToaster: () => null,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());
function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
}
const EMB: EmbedderInfo[] = [
  { id: "openai", label: "OpenAI", needs_key: false, sdk_available: true, install_extra: null, env_var: "X", key_set: false, env_key: true, default_model: "text-embedding-ada-002" },
];
const NEEDS_KEY: EmbedderInfo[] = [
  { id: "openai", label: "OpenAI", needs_key: true, sdk_available: true, install_extra: null, env_var: "X", key_set: false, env_key: false, default_model: "text-embedding-ada-002" },
];
const DET: CollectionDetails = { name: "docs", count: 1, dimensionality: 1536, distance_metric: "l2", embedding_function: "default", metadata: {} };

test("picking a provider sets the spec and persists the hint", async () => {
  const setSpy = vi.spyOn(api, "setCollectionEmbedder").mockResolvedValue(undefined);
  const onChange = vi.fn();
  const spec: QuerySpec = { ...newQuerySpec(), mode: "text" };
  render(wrap(<EmbedderPicker name="docs" details={DET} embedders={EMB} spec={spec} onChange={onChange} />));
  await userEvent.selectOptions(screen.getByLabelText(/embed query with/i), "openai");
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ embedder: { provider: "openai", model: "" } }));
  await waitFor(() => expect(setSpy).toHaveBeenCalledWith("docs", { provider: "openai", model: "" }));
  expect(toastSuccess).toHaveBeenCalledWith("Embedder hint saved");
});

test("choosing - none - clears the spec and the hint", async () => {
  const clearSpy = vi.spyOn(api, "clearCollectionEmbedder").mockResolvedValue(undefined);
  const onChange = vi.fn();
  const spec: QuerySpec = { ...newQuerySpec(), mode: "text", embedder: { provider: "openai", model: "m" } };
  render(wrap(<EmbedderPicker name="docs" details={DET} embedders={EMB} spec={spec} onChange={onChange} />));
  await userEvent.selectOptions(screen.getByLabelText(/embed query with/i), "");
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ embedder: null }));
  await waitFor(() => expect(clearSpy).toHaveBeenCalled());
  expect(toastSuccess).toHaveBeenCalledWith("Embedder hint cleared");
});

test("a failed hint save toasts an error", async () => {
  vi.spyOn(api, "setCollectionEmbedder").mockRejectedValue(new Error("dim mismatch"));
  const spec: QuerySpec = { ...newQuerySpec(), mode: "text" };
  render(wrap(<EmbedderPicker name="docs" details={DET} embedders={EMB} spec={spec} onChange={() => {}} />));
  await userEvent.selectOptions(screen.getByLabelText(/embed query with/i), "openai");
  await waitFor(() => expect(toastError).toHaveBeenCalledWith("dim mismatch"));
});

test("a failed hint clear toasts an error", async () => {
  vi.spyOn(api, "clearCollectionEmbedder").mockRejectedValue(new Error("nope"));
  const spec: QuerySpec = { ...newQuerySpec(), mode: "text", embedder: { provider: "openai", model: "m" } };
  render(wrap(<EmbedderPicker name="docs" details={DET} embedders={EMB} spec={spec} onChange={() => {}} />));
  await userEvent.selectOptions(screen.getByLabelText(/embed query with/i), "");
  await waitFor(() => expect(toastError).toHaveBeenCalledWith("nope"));
});

test("setting an API key toasts success", async () => {
  const spy = vi.spyOn(api, "setEmbedderKey").mockResolvedValue(undefined);
  const spec: QuerySpec = { ...newQuerySpec(), mode: "text", embedder: { provider: "openai", model: "" } };
  render(wrap(<EmbedderPicker name="docs" details={DET} embedders={NEEDS_KEY} spec={spec} onChange={() => {}} />));
  await userEvent.type(screen.getByLabelText(/api key/i), "sk-test");
  await userEvent.click(screen.getByRole("button", { name: /set key/i }));
  await waitFor(() => expect(spy).toHaveBeenCalledWith("openai", "sk-test"));
  expect(toastSuccess).toHaveBeenCalledWith("API key set");
});

test("a failed key set toasts an error", async () => {
  vi.spyOn(api, "setEmbedderKey").mockRejectedValue(new Error("bad key"));
  const spec: QuerySpec = { ...newQuerySpec(), mode: "text", embedder: { provider: "openai", model: "" } };
  render(wrap(<EmbedderPicker name="docs" details={DET} embedders={NEEDS_KEY} spec={spec} onChange={() => {}} />));
  await userEvent.type(screen.getByLabelText(/api key/i), "sk-test");
  await userEvent.click(screen.getByRole("button", { name: /set key/i }));
  await waitFor(() => expect(toastError).toHaveBeenCalledWith("bad key"));
});

test("shows the collection dimension hint", () => {
  render(wrap(<EmbedderPicker name="docs" details={DET} embedders={EMB} spec={{ ...newQuerySpec(), mode: "text" }} onChange={() => {}} />));
  expect(screen.getByText(/1536-dim/)).toBeInTheDocument();
});

test("offers curated model suggestions via a datalist and shows the provider default as the placeholder", () => {
  const spec: QuerySpec = { ...newQuerySpec(), mode: "text", embedder: { provider: "openai", model: "" } };
  render(wrap(<EmbedderPicker name="docs" details={DET} embedders={EMB} spec={spec} onChange={() => {}} />));
  const model = screen.getByPlaceholderText(/leave blank for text-embedding-ada-002/i);
  expect(model).toHaveAttribute("list", "models-openai");
  const options = Array.from(document.querySelectorAll("#models-openai option")).map((o) => (o as HTMLOptionElement).value);
  expect(options).toContain("text-embedding-3-small");
  expect(options).toContain("text-embedding-3-large");
  expect(options).toContain("text-embedding-ada-002"); // registry default merged into the list
});
