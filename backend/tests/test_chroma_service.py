import chromadb
import pytest

from chunklens import chroma_service
from chunklens.chroma_client import heartbeat


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
