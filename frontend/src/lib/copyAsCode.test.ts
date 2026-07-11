import { expect, test } from "vitest";
import { queryAsJs, queryAsPython, recordGetAsJs, recordGetAsPython } from "./copyAsCode";

const TARGET = {
  host: "localhost", port: 8000, ssl: false,
  tenant: "default_tenant", database: "default_database",
};

test("queryAsPython renders a runnable text query with filters", () => {
  const out = queryAsPython(TARGET, "demo", {
    query_text: "alpha beta",
    n_results: 5,
    where: { lang: { $eq: "en" } },
  });
  expect(out).toBe(`import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)
collection = client.get_collection("demo")
results = collection.query(
    query_texts=["alpha beta"],
    n_results=5,
    where={"lang": {"$eq": "en"}},
)
print(results)
`);
});

test("queryAsPython uses Python literals for booleans, null, and numbers in filters", () => {
  const out = queryAsPython(TARGET, "demo", {
    query_text: "q",
    where: { flag: true, gone: false, score: { $gt: 0.5 } },
    where_document: { $contains: "chunk" },
  });
  expect(out).toContain('where={"flag": True, "gone": False, "score": {"$gt": 0.5}}');
  expect(out).toContain('where_document={"$contains": "chunk"}');
});

test("queryAsPython renders a vector query via query_embeddings", () => {
  const out = queryAsPython(TARGET, "demo", { query_embedding: [0.1, 0.2], n_results: 3 });
  expect(out).toContain("query_embeddings=[[0.1, 0.2]]");
  expect(out).not.toContain("query_texts");
});

test("queryAsPython notes the embedder choice as a comment", () => {
  const out = queryAsPython(TARGET, "demo", {
    query_text: "q",
    embedder: { provider: "openai", model: "text-embedding-3-small" },
  });
  expect(out).toContain("# Embedded via openai (text-embedding-3-small)");
});

test("non-default connection facts are emitted, defaults are omitted", () => {
  const custom = { host: "10.0.0.5", port: 9000, ssl: true, tenant: "acme", database: "prod" };
  const py = queryAsPython(custom, "demo", { query_text: "q" });
  expect(py).toContain(
    'chromadb.HttpClient(host="10.0.0.5", port=9000, ssl=True, tenant="acme", database="prod")',
  );
  const js = queryAsJs(custom, "demo", { query_text: "q" });
  expect(js).toContain(
    'new ChromaClient({ host: "10.0.0.5", port: 9000, ssl: true, tenant: "acme", database: "prod" })',
  );
  expect(queryAsPython(TARGET, "demo", { query_text: "q" })).not.toContain("tenant");
  expect(queryAsJs(TARGET, "demo", { query_text: "q" })).not.toContain("ssl");
});

test("queryAsJs renders a runnable text query with filters", () => {
  const out = queryAsJs(TARGET, "demo", {
    query_text: "alpha beta",
    n_results: 5,
    where: { lang: { $eq: "en" } },
  });
  expect(out).toBe(`import { ChromaClient } from "chromadb";

const client = new ChromaClient({ host: "localhost", port: 8000 });
const collection = await client.getCollection({ name: "demo" });
const results = await collection.query({
  queryTexts: ["alpha beta"],
  nResults: 5,
  where: {"lang":{"$eq":"en"}},
});
console.log(results);
`);
});

test("queryAsJs renders vector queries and the embedder comment", () => {
  const out = queryAsJs(TARGET, "demo", {
    query_embedding: [1, 2],
    embedder: { provider: "cohere" },
  });
  expect(out).toContain("queryEmbeddings: [[1,2]]");
  expect(out).toContain("// Embedded via cohere");
});

test("record get snippets fetch one id with documents, metadatas, and embeddings", () => {
  const py = recordGetAsPython(TARGET, "demo", "chunk-1");
  expect(py).toContain('collection.get(ids=["chunk-1"], include=["documents", "metadatas", "embeddings"])');
  const js = recordGetAsJs(TARGET, "demo", "chunk-1");
  expect(js).toContain('collection.get({ ids: ["chunk-1"], include: ["documents", "metadatas", "embeddings"] })');
});

test("n_results defaults to 10 when the request omits it", () => {
  expect(queryAsPython(TARGET, "demo", { query_text: "q" })).toContain("n_results=10");
  expect(queryAsJs(TARGET, "demo", { query_text: "q" })).toContain("nResults: 10");
});
