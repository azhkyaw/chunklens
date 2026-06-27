from __future__ import annotations

from .schemas import CollectionSummary


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
