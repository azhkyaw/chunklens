import chromadb
import pytest

from chunklens import chroma_client, chroma_service
from chunklens.chroma_client import heartbeat
from chunklens.schemas import ConnectionConfig


def test_heartbeat_returns_int():
    client = chromadb.EphemeralClient()
    assert isinstance(heartbeat(client), int)


def test_list_collections_returns_name_and_count(chroma):
    cols = chroma_service.list_collections(chroma)
    assert [(c.name, c.count) for c in cols] == [("docs", 3)]


def test_get_records_paginates(chroma):
    page = chroma_service.get_records(chroma, "docs", limit=2, offset=0)
    assert page.total == 3
    assert page.limit == 2 and page.offset == 0
    assert len(page.items) == 2
    assert {i.id for i in page.items} <= {"a", "b", "c"}
    assert all(isinstance(i.document, str) for i in page.items)


def test_query_by_embedding_ranks_by_distance(chroma):
    res = chroma_service.query(chroma, "docs", query_embedding=[1.0, 0.0], n_results=2)
    assert len(res.hits) == 2
    assert res.hits[0].id == "a"  # exact match to [1,0]
    assert res.hits[0].distance <= res.hits[1].distance


def test_query_with_metadata_filter(chroma):
    res = chroma_service.query(
        chroma, "docs", query_embedding=[1.0, 0.0], n_results=10, where={"lang": "en"}
    )
    assert {h.id for h in res.hits} == {"a", "c"}  # english docs only


def test_query_requires_text_or_embedding(chroma):
    with pytest.raises(ValueError):
        chroma_service.query(chroma, "docs")


def test_headers_for_token():
    cfg = ConnectionConfig(auth_mode="token", token="abc")
    assert chroma_client.headers_for(cfg) == {"Authorization": "Bearer abc"}


def test_headers_for_none():
    assert chroma_client.headers_for(ConnectionConfig()) == {}


def test_client_for_config_passes_ssl_and_headers(monkeypatch):
    captured = {}

    def fake_make_client(**kwargs):
        captured.update(kwargs)
        return "CLIENT"

    monkeypatch.setattr(chroma_client, "make_client", fake_make_client)
    cfg = ConnectionConfig(host="h", port=1, ssl=True, auth_mode="token", token="t")
    assert chroma_client.client_for_config(cfg) == "CLIENT"
    assert captured["ssl"] is True
    assert captured["headers"] == {"Authorization": "Bearer t"}
    assert captured["host"] == "h"


def _fresh_client():
    client = chromadb.EphemeralClient()
    for c in client.list_collections():
        client.delete_collection(c if isinstance(c, str) else c.name)
    return client


def test_is_reserved():
    assert chroma_service._is_reserved("hnsw:space") is True
    assert chroma_service._is_reserved("chroma:foo") is True
    assert chroma_service._is_reserved("desc") is False


def test_create_default_ef_details():
    client = _fresh_client()
    d = chroma_service.create_collection(
        client, "alpha_col", distance_metric="cosine", embedding_function="default"
    )
    assert d.name == "alpha_col"
    assert d.count == 0
    assert d.dimensionality is None
    assert d.distance_metric == "cosine"
    assert d.embedding_function == "default"
    assert d.metadata == {}


def test_create_none_ef_and_dimensionality():
    client = _fresh_client()
    chroma_service.create_collection(client, "raw_col", embedding_function="none")
    col = client.get_collection("raw_col")
    col.add(ids=["a"], embeddings=[[1.0, 2.0, 3.0]])
    d = chroma_service.get_collection_details(client, "raw_col")
    assert d.embedding_function == "none"
    assert d.dimensionality == 3


def test_create_duplicate_raises_conflict():
    client = _fresh_client()
    chroma_service.create_collection(client, "dup_col")
    with pytest.raises(chroma_service.Conflict):
        chroma_service.create_collection(client, "dup_col")


def test_create_invalid_name_raises_invalidname():
    client = _fresh_client()
    with pytest.raises(chroma_service.InvalidName):
        chroma_service.create_collection(client, "x")  # too short (<3 chars)


def test_get_details_missing_raises_notfound():
    client = _fresh_client()
    with pytest.raises(chroma_service.NotFound):
        chroma_service.get_collection_details(client, "nope_col")


def test_merge_collection_metadata_preserves_reserved():
    merged = chroma_service._merge_collection_metadata(
        {"hnsw:space": "cosine", "desc": "old"}, {"desc": "new", "owner": "me"}
    )
    assert merged == {"hnsw:space": "cosine", "desc": "new", "owner": "me"}


def test_rename_and_collision():
    client = _fresh_client()
    chroma_service.create_collection(client, "from_col")
    d = chroma_service.rename_collection(client, "from_col", "to_col")
    assert d.name == "to_col"
    assert chroma_service.collection_exists(client, "to_col")
    assert not chroma_service.collection_exists(client, "from_col")

    chroma_service.create_collection(client, "other_col")
    with pytest.raises(chroma_service.Conflict):
        chroma_service.rename_collection(client, "to_col", "other_col")


def test_update_collection_metadata_replaces_user_keys():
    client = _fresh_client()
    chroma_service.create_collection(client, "meta_col", metadata={"a": "1"})
    d = chroma_service.update_collection_metadata(client, "meta_col", {"b": "2"})
    assert d.metadata == {"b": "2"}  # 'a' replaced away


def test_delete_collection_and_missing():
    client = _fresh_client()
    chroma_service.create_collection(client, "del_col")
    chroma_service.delete_collection(client, "del_col")
    assert not chroma_service.collection_exists(client, "del_col")
    with pytest.raises(chroma_service.NotFound):
        chroma_service.delete_collection(client, "del_col")


def test_replace_payload_nulls_removed_keys():
    # k2 removed -> emitted as None so Chroma deletes it; k1 updated
    assert chroma_service._replace_payload({"k1": "a", "k2": 2}, {"k1": "b"}) == {
        "k1": "b",
        "k2": None,
    }
    assert chroma_service._replace_payload({}, {}) == {}


def test_update_record_metadata_replaces_and_removes_keys():
    client = _fresh_client()
    chroma_service.create_collection(client, "rec_col", embedding_function="none")
    col = client.get_collection("rec_col")
    col.add(ids=["r1"], embeddings=[[1.0, 2.0]], metadatas=[{"k1": "a", "k2": 2}])

    rec = chroma_service.update_record_metadata(client, "rec_col", "r1", {"k1": "b"})
    assert rec.id == "r1"
    assert rec.metadata == {"k1": "b"}  # k2 removed

    stored = col.get(ids=["r1"], include=["metadatas"])["metadatas"][0]
    assert stored == {"k1": "b"}  # confirmed against Chroma


def test_update_record_metadata_missing_record():
    client = _fresh_client()
    chroma_service.create_collection(client, "rec_col2", embedding_function="none")
    with pytest.raises(chroma_service.NotFound):
        chroma_service.update_record_metadata(client, "rec_col2", "ghost", {"x": 1})


def test_scalar_type_bool_before_int():
    assert chroma_service._scalar_type(True) == "bool"
    assert chroma_service._scalar_type(3) == "int"
    assert chroma_service._scalar_type(1.5) == "float"
    assert chroma_service._scalar_type("x") == "string"


def test_sample_metadata_keys_aggregates_types_and_hides_reserved():
    client = _fresh_client()
    chroma_service.create_collection(client, "keys_col", embedding_function="none")
    col = client.get_collection("keys_col")
    col.add(
        ids=["1", "2"],
        embeddings=[[1.0, 2.0], [3.0, 4.0]],
        metadatas=[{"lang": "en", "year": 2020, "ok": True}, {"lang": "fr", "year": 2021}],
    )
    resp = chroma_service.sample_metadata_keys(client, "keys_col")
    by_key = {k.key: k.types for k in resp.keys}
    assert by_key == {"lang": ["string"], "ok": ["bool"], "year": ["int"]}
    assert resp.sampled == 2
    assert resp.total == 2
    # reserved hnsw:* key (present because EF=none stores hnsw:space) is hidden
    assert all(not k.key.startswith("hnsw:") for k in resp.keys)


def test_sample_metadata_keys_missing_collection_raises_notfound():
    client = _fresh_client()
    with pytest.raises(chroma_service.NotFound):
        chroma_service.sample_metadata_keys(client, "nope_col")
