from __future__ import annotations

from .schemas import CollectionSummary, Record, RecordsPage


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
