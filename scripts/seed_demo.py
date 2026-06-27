"""Seed a demo collection into a locally running Chroma (localhost:8000).

Seeds documents only (no raw embeddings) so the collection's default embedding
function embeds them. The e2e drives the UI, which issues a *text* query, so the
seeded data and the query must share one embedding function to be comparable.
"""
import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)
try:
    client.delete_collection("demo")
except Exception:
    pass
col = client.create_collection("demo")
col.add(
    ids=["a", "b", "c"],
    documents=["alpha doc", "beta doc", "gamma doc"],
    metadatas=[{"lang": "en"}, {"lang": "fr"}, {"lang": "en"}],
)
print("seeded demo:", col.count())
