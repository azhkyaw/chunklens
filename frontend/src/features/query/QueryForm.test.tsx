import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { QueryForm } from "./QueryForm";
import { newQuerySpec, type QuerySpec } from "./querySpec";
import { api } from "../../api/client";
import { useCollectionDetails } from "../../api/hooks";
import type { CollectionDetails, EmbedderInfo } from "../../api/types";

const details: CollectionDetails = {
  name: "c", count: 1, dimensionality: 3,
  distance_metric: "l2", embedding_function: "none", metadata: {},
};
const openaiDetails: CollectionDetails = { ...details, embedding_function: "openai", dimensionality: 1536 };
const OPENAI: EmbedderInfo = {
  id: "openai", label: "OpenAI", needs_key: true, sdk_available: true,
  install_extra: null, env_var: "CHROMA_OPENAI_API_KEY", key_set: false, env_key: false,
};

afterEach(() => vi.restoreAllMocks());
function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

test("editing query text calls onChange with the updated spec", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  const onChange = vi.fn();
  render(wrap(<QueryForm name="docs" spec={newQuerySpec()} onChange={onChange} />));
  await userEvent.type(screen.getByLabelText(/query text/i), "x");
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ text: "x" }));
});

test("renders both filter builders", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  render(wrap(<QueryForm name="docs" spec={newQuerySpec()} onChange={() => {}} />));
  expect(screen.getByText(/Metadata filter \(where\)/)).toBeInTheDocument();
  expect(screen.getByText(/Document filter \(where_document\)/)).toBeInTheDocument();
});

test("vector mode shows the expected-dim hint and a wrong-length error", () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  const spec = { ...newQuerySpec(), mode: "vector" as const, vector: "[1, 2]" };
  render(wrap(<QueryForm name="c" spec={spec} details={details} onChange={() => {}} />));
  expect(screen.getByText(/expects 3-dim/i)).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(/expected 3 numbers, got 2/i);
});

test("vector mode shows no error for an untouched (empty) vector", () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  const spec = { ...newQuerySpec(), mode: "vector" as const };
  render(wrap(<QueryForm name="c" spec={spec} details={details} onChange={() => {}} />));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("text mode shows the text input; toggling to Vector calls onChange", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  const onChange = vi.fn();
  render(wrap(<QueryForm name="c" spec={newQuerySpec()} details={details} onChange={onChange} />));
  expect(screen.getByLabelText(/query text/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: /^vector$/i }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: "vector" }));
});

test("auto-detects a provider collection and attaches an embedder", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([OPENAI]);
  const onChange = vi.fn();
  render(wrap(<QueryForm name="c" spec={newQuerySpec()} details={openaiDetails} onChange={onChange} />));
  // the EmbedderPicker select is shown for a non-default-EF collection
  expect(await screen.findByLabelText(/embed query with/i)).toBeInTheDocument();
  // auto-attach fires onChange with the detected provider (embedders hook is async, so wait)
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ embedder: { provider: "openai", model: "" } })));
});

test("clearing the embedder to none survives the hint-invalidation refetch", async () => {
  // Real refetch trigger: the clear-hint mutation invalidates ["collection", name],
  // and the *actual* backend payload changes (embedder_hint: {provider:"openai"} -> null)
  // - a genuine content change, not a fabricated identity change - so structural sharing
  // mints a new `details` object and the prefill effect's dependency array changes.
  const withHint: CollectionDetails = { ...openaiDetails, embedder_hint: { provider: "openai", model: null } };
  const withoutHint: CollectionDetails = { ...openaiDetails, embedder_hint: null };
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([OPENAI]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValueOnce(withHint).mockResolvedValue(withoutHint);
  vi.spyOn(api, "clearCollectionEmbedder").mockResolvedValue(undefined);

  function Harness() {
    const [spec, setSpec] = useState<QuerySpec>(() => newQuerySpec());
    const { data: details } = useCollectionDetails("docs");
    return <QueryForm name="docs" spec={spec} details={details} onChange={setSpec} />;
  }
  render(wrap(<Harness />));

  const select = await screen.findByLabelText(/embed query with/i);
  await waitFor(() => expect(select).toHaveValue("openai")); // prefill applied

  await userEvent.selectOptions(select, ""); // pick - none -

  // the clear-hint mutation's onSuccess invalidates ["collection", "docs"]; the
  // refetch resolves to `withoutHint` above (a real content change).
  await waitFor(() => expect(select).toHaveValue(""));
  expect(select).toHaveValue(""); // stays cleared, does not snap back to openai
});

test("n_results is clamped to the range the backend accepts", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  const onChange = vi.fn();
  render(wrap(<QueryForm name="docs" spec={newQuerySpec()} onChange={onChange} />));
  const n = screen.getByLabelText(/n_results/i);
  expect(n).toHaveAttribute("min", "1");
  expect(n).toHaveAttribute("max", "1000");

  // The backend rejects anything outside 1..1000 with a 422, so the form must
  // not be able to build such a request in the first place.
  fireEvent.change(n, { target: { value: "2000" } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ nResults: 1000 }));

  fireEvent.change(n, { target: { value: "0" } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ nResults: 1 }));
});

test("no embedder UI for a default-EF collection", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([OPENAI]);
  const def: CollectionDetails = { ...details, embedding_function: "default", dimensionality: 384 };
  render(wrap(<QueryForm name="c" spec={newQuerySpec()} details={def} onChange={() => {}} />));
  await screen.findByLabelText(/query text/i);
  expect(screen.queryByText(/embed with/i)).not.toBeInTheDocument();
});
