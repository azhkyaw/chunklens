import type { QueryRequest } from "../api/types";

// The connection facts a runnable snippet needs. ConnectionInfo (api/types)
// is structurally assignable, so callers pass useConnection()'s data as-is.
export interface CodeTarget {
  host: string;
  port: number;
  ssl: boolean;
  tenant: string;
  database: string;
}

const DEFAULT_TENANT = "default_tenant";
const DEFAULT_DATABASE = "default_database";

// JSON-shaped value -> Python literal (True/False/None, dicts, lists).
function py(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(py).join(", ")}]`;
  return `{${Object.entries(v as Record<string, unknown>)
    .map(([k, val]) => `${JSON.stringify(k)}: ${py(val)}`)
    .join(", ")}}`;
}

function pyClient(t: CodeTarget): string {
  const args = [`host=${py(t.host)}`, `port=${t.port}`];
  if (t.ssl) args.push("ssl=True");
  if (t.tenant !== DEFAULT_TENANT) args.push(`tenant=${py(t.tenant)}`);
  if (t.database !== DEFAULT_DATABASE) args.push(`database=${py(t.database)}`);
  return `client = chromadb.HttpClient(${args.join(", ")})`;
}

function jsClient(t: CodeTarget): string {
  const opts = [`host: ${JSON.stringify(t.host)}`, `port: ${t.port}`];
  if (t.ssl) opts.push("ssl: true");
  if (t.tenant !== DEFAULT_TENANT) opts.push(`tenant: ${JSON.stringify(t.tenant)}`);
  if (t.database !== DEFAULT_DATABASE) opts.push(`database: ${JSON.stringify(t.database)}`);
  return `const client = new ChromaClient({ ${opts.join(", ")} });`;
}

// ChunkLens embeds server-side via its own EF registry; raw chromadb clients
// attach the EF at get_collection time instead, so the snippet says which one.
function embedderNote(req: QueryRequest, comment: string, hint: string): string {
  if (!req.embedder) return "";
  const model = req.embedder.model ? ` (${req.embedder.model})` : "";
  return `\n${comment} Embedded via ${req.embedder.provider}${model}; ${hint}`;
}

export function queryAsPython(target: CodeTarget, collection: string, req: QueryRequest): string {
  const args: string[] = [];
  if (req.query_embedding) args.push(`query_embeddings=[${py(req.query_embedding)}]`);
  else args.push(`query_texts=[${py(req.query_text ?? "")}]`);
  args.push(`n_results=${req.n_results ?? 10}`);
  if (req.where) args.push(`where=${py(req.where)}`);
  if (req.where_document) args.push(`where_document=${py(req.where_document)}`);
  const note = embedderNote(req, "#", "pass the matching embedding_function to get_collection.");
  return `import chromadb

${pyClient(target)}
collection = client.get_collection(${py(collection)})${note}
results = collection.query(
    ${args.join(",\n    ")},
)
print(results)
`;
}

export function queryAsJs(target: CodeTarget, collection: string, req: QueryRequest): string {
  const args: string[] = [];
  if (req.query_embedding) args.push(`queryEmbeddings: [${JSON.stringify(req.query_embedding)}]`);
  else args.push(`queryTexts: [${JSON.stringify(req.query_text ?? "")}]`);
  args.push(`nResults: ${req.n_results ?? 10}`);
  if (req.where) args.push(`where: ${JSON.stringify(req.where)}`);
  if (req.where_document) args.push(`whereDocument: ${JSON.stringify(req.where_document)}`);
  const note = embedderNote(req, "//", "pass the matching embeddingFunction to getCollection.");
  return `import { ChromaClient } from "chromadb";

${jsClient(target)}
const collection = await client.getCollection({ name: ${JSON.stringify(collection)} });${note}
const results = await collection.query({
  ${args.join(",\n  ")},
});
console.log(results);
`;
}

export function recordGetAsPython(target: CodeTarget, collection: string, id: string): string {
  return `import chromadb

${pyClient(target)}
collection = client.get_collection(${py(collection)})
record = collection.get(ids=[${py(id)}], include=["documents", "metadatas", "embeddings"])
print(record)
`;
}

export function recordGetAsJs(target: CodeTarget, collection: string, id: string): string {
  return `import { ChromaClient } from "chromadb";

${jsClient(target)}
const collection = await client.getCollection({ name: ${JSON.stringify(collection)} });
const record = await collection.get({ ids: [${JSON.stringify(id)}], include: ["documents", "metadatas", "embeddings"] });
console.log(record);
`;
}
