from __future__ import annotations

from typing import Any, Optional

from .schemas import CollectionSummary, QueryHit, QueryResult, Record, RecordsPage


def _name_of(c) -> str:
    # chromadb has returned either Collection objects or bare names across versions.
    return c if isinstance(c, str) else c.name


def list_collections(client) -> list[CollectionSummary]:
    summaries: list[CollectionSummary] = []
    for c in client.list_collections():
        name = _name_of(c)
        col = client.get_collection(name)
        summaries.append(CollectionSummary(name=name, count=col.count()))
    return summaries


def get_records(client, name: str, limit: int = 50, offset: int = 0) -> RecordsPage:
    col = client.get_collection(name)
    total = col.count()
    res = col.get(include=["documents", "metadatas"], limit=limit, offset=offset)
    ids = res.get("ids") or []
    docs = res.get("documents") or [None] * len(ids)
    metas = res.get("metadatas") or [None] * len(ids)
    items = [
        Record(id=i, document=d, metadata=m)
        for i, d, m in zip(ids, docs, metas)
    ]
    return RecordsPage(items=items, limit=limit, offset=offset, total=total)


def query(
    client,
    name: str,
    *,
    query_text: Optional[str] = None,
    query_embedding: Optional[list[float]] = None,
    n_results: int = 10,
    where: Optional[dict] = None,
    where_document: Optional[dict] = None,
) -> QueryResult:
    col = client.get_collection(name)
    kwargs: dict[str, Any] = {
        "n_results": n_results,
        "include": ["documents", "metadatas", "distances"],
    }
    if query_embedding is not None:
        kwargs["query_embeddings"] = [query_embedding]
    elif query_text is not None:
        kwargs["query_texts"] = [query_text]
    else:
        raise ValueError("Provide query_text or query_embedding")
    if where:
        kwargs["where"] = where
    if where_document:
        kwargs["where_document"] = where_document

    res = col.query(**kwargs)
    ids = (res.get("ids") or [[]])[0]
    docs = (res.get("documents") or [[None] * len(ids)])[0]
    metas = (res.get("metadatas") or [[None] * len(ids)])[0]
    dists = (res.get("distances") or [[0.0] * len(ids)])[0]
    hits = [
        QueryHit(id=i, document=d, metadata=m, distance=float(dist))
        for i, d, m, dist in zip(ids, docs, metas, dists)
    ]
    return QueryResult(hits=hits)
