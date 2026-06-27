import chromadb

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
