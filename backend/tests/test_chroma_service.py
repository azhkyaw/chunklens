import chromadb

from chunklens import chroma_service
from chunklens.chroma_client import heartbeat


def test_heartbeat_returns_int():
    client = chromadb.EphemeralClient()
    assert isinstance(heartbeat(client), int)


def test_list_collections_returns_name_and_count(chroma):
    cols = chroma_service.list_collections(chroma)
    assert [(c.name, c.count) for c in cols] == [("docs", 3)]
