import chromadb

from chunklens.chroma_client import heartbeat


def test_heartbeat_returns_int():
    client = chromadb.EphemeralClient()
    assert isinstance(heartbeat(client), int)
