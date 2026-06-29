from __future__ import annotations

from typing import Any, Optional

from chromadb.errors import InvalidArgumentError, NotFoundError

from .schemas import (
    CollectionDetails,
    CollectionSummary,
    ExportRecord,
    MetadataKeyInfo,
    MetadataKeysResponse,
    QueryHit,
    QueryResult,
    Record,
    RecordsPage,
)


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


class NotFound(Exception):
    """Collection or record does not exist."""


class Conflict(Exception):
    """A collection with the target name already exists."""


class InvalidName(Exception):
    """Collection name violates Chroma's naming rules."""


_RESERVED_PREFIXES = ("hnsw:", "chroma:")


def _is_reserved(key: str) -> bool:
    return any(key.startswith(p) for p in _RESERVED_PREFIXES)


def _user_metadata(meta: Optional[dict]) -> dict:
    return {k: v for k, v in (meta or {}).items() if not _is_reserved(k)}


def collection_exists(client, name: str) -> bool:
    return any(_name_of(c) == name for c in client.list_collections())


def _get(client, name: str):
    try:
        return client.get_collection(name)
    except NotFoundError as exc:
        raise NotFound(f"Collection {name!r} not found") from exc


def _peek_dim(col) -> Optional[int]:
    got = col.get(limit=1, include=["embeddings"])
    embs = got.get("embeddings")
    if embs is not None and len(embs) > 0:
        return len(embs[0])
    return None


def _ef_name(col, cfg: dict) -> str:
    # Source of truth is the persisted config, not col._embedding_function:
    # get_collection() re-attaches a DefaultEmbeddingFunction object even when a
    # collection was created with embedding_function=None, so the in-memory attribute
    # can't distinguish "none" after a re-fetch. configuration_json records it faithfully.
    if "embedding_function" in cfg:
        ef_cfg = cfg["embedding_function"]
        if ef_cfg is None:
            return "none"
        if isinstance(ef_cfg, dict) and ef_cfg.get("name"):
            return ef_cfg["name"]
    if getattr(col, "_embedding_function", None) is None:
        return "none"
    return type(col._embedding_function).__name__


def get_collection_details(client, name: str) -> CollectionDetails:
    col = _get(client, name)
    cfg = col.configuration_json or {}
    metric = (cfg.get("hnsw") or {}).get("space", "l2")
    return CollectionDetails(
        name=name,
        count=col.count(),
        dimensionality=_peek_dim(col),
        distance_metric=metric,
        embedding_function=_ef_name(col, cfg),
        metadata=_user_metadata(col.metadata),
    )


def create_collection(
    client,
    name: str,
    *,
    distance_metric: str = "l2",
    embedding_function: str = "default",
    metadata: Optional[dict] = None,
) -> CollectionDetails:
    if collection_exists(client, name):
        raise Conflict(f"Collection {name!r} already exists")
    user_meta = _user_metadata(metadata)
    kwargs: dict[str, Any] = {}
    if embedding_function == "none":
        # Passing configuration= alongside embedding_function=None makes Chroma persist
        # a '{type: legacy}' EF marker (and re-attach a broken default EF on re-fetch).
        # Setting the hnsw space via the legacy metadata form instead keeps
        # embedding_function persisted cleanly as None, while configuration_json still
        # reflects the chosen space - so get_collection_details reports "none".
        kwargs["embedding_function"] = None
        kwargs["metadata"] = {"hnsw:space": distance_metric, **user_meta}
    else:
        kwargs["configuration"] = {"hnsw": {"space": distance_metric}}
        if user_meta:
            kwargs["metadata"] = user_meta
    try:
        client.create_collection(name, **kwargs)
    except InvalidArgumentError as exc:
        raise InvalidName(str(exc)) from exc
    return get_collection_details(client, name)


def _merge_collection_metadata(current: Optional[dict], new_user: Optional[dict]) -> dict:
    """Collection modify() replaces metadata, so keep reserved keys and swap user keys."""
    reserved = {k: v for k, v in (current or {}).items() if _is_reserved(k)}
    return {**reserved, **_user_metadata(new_user)}


def rename_collection(client, name: str, new_name: str) -> CollectionDetails:
    col = _get(client, name)
    if new_name != name and collection_exists(client, new_name):
        raise Conflict(f"Collection {new_name!r} already exists")
    try:
        col.modify(name=new_name)
    except InvalidArgumentError as exc:
        raise InvalidName(str(exc)) from exc
    return get_collection_details(client, new_name)


def update_collection_metadata(client, name: str, metadata: Optional[dict]) -> CollectionDetails:
    col = _get(client, name)
    merged = _merge_collection_metadata(col.metadata, metadata)
    if merged:  # Chroma rejects modify(metadata={}); empty result is a no-op
        col.modify(metadata=merged)
    return get_collection_details(client, name)


def delete_collection(client, name: str) -> None:
    if not collection_exists(client, name):
        raise NotFound(f"Collection {name!r} not found")
    client.delete_collection(name)


def _replace_payload(old: dict, new: dict) -> dict:
    """Emulate replace on Chroma's merge-update: set new keys, null removed keys."""
    payload = dict(new)
    for key in old:
        if key not in new:
            payload[key] = None
    return payload


def update_record_metadata(client, name: str, record_id: str, metadata: dict) -> Record:
    col = _get(client, name)
    existing = col.get(ids=[record_id], include=["documents", "metadatas"])
    if not existing["ids"]:
        raise NotFound(f"Record {record_id!r} not found in {name!r}")
    old = (existing["metadatas"] or [None])[0] or {}
    payload = _replace_payload(old, dict(metadata))
    if payload:  # Chroma rejects update(metadatas=[{}])
        col.update(ids=[record_id], metadatas=[payload])
    document = (existing["documents"] or [None])[0]
    return Record(id=record_id, document=document, metadata=(dict(metadata) or None))


def _scalar_type(v) -> str:
    if isinstance(v, bool):  # bool is a subclass of int - check first
        return "bool"
    if isinstance(v, int):
        return "int"
    if isinstance(v, float):
        return "float"
    return "string"


def sample_metadata_keys(client, name: str, sample: int = 200) -> MetadataKeysResponse:
    col = _get(client, name)
    total = col.count()
    res = col.get(limit=sample, include=["metadatas"])
    metas = res.get("metadatas") or []
    agg: dict[str, set] = {}
    for m in metas:
        for k, v in (m or {}).items():
            if _is_reserved(k):
                continue
            agg.setdefault(k, set()).add(_scalar_type(v))
    keys = [MetadataKeyInfo(key=k, types=sorted(t)) for k, t in sorted(agg.items())]
    return MetadataKeysResponse(keys=keys, sampled=len(metas), total=total)


_ADD_BATCH = 500


def add_records(client, name: str, records: list[ExportRecord]) -> int:
    col = _get(client, name)
    ef = _ef_name(col, col.configuration_json or {})
    have = [r.embedding is not None for r in records]
    if any(have) and not all(have):
        raise ValueError("Either every record includes an embedding, or none do.")
    use_embeddings = bool(records) and all(have)
    if ef == "none" and records and not use_embeddings:
        raise ValueError(
            "Collection has no embedding function, so every record must include an embedding."
        )
    if use_embeddings:
        dims = {len(r.embedding) for r in records}
        if len(dims) > 1:
            raise ValueError(f"Inconsistent embedding dimensions: {sorted(dims)}")
    added = 0
    for i in range(0, len(records), _ADD_BATCH):
        batch = records[i : i + _ADD_BATCH]
        metadatas = [r.metadata or None for r in batch]
        kwargs: dict[str, Any] = {
            "ids": [r.id for r in batch],
            "documents": [r.document for r in batch],
        }
        if any(m is not None for m in metadatas):
            kwargs["metadatas"] = metadatas
        if use_embeddings:
            kwargs["embeddings"] = [r.embedding for r in batch]
        col.add(**kwargs)
        added += len(batch)
    return added
