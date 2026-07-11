from __future__ import annotations

import chromadb
import pytest
from fastapi.testclient import TestClient

import chunklens.embedders as E
from chunklens.app import app
from chunklens.deps import get_client


@pytest.fixture()
def chroma():
    # Every EphemeralClient() in a process shares ONE in-memory System (cached
    # under the "ephemeral" identifier) and that System requires identical
    # settings across all callers. So we keep default settings and clear any
    # collections leaked from a previous test before seeding.
    client = chromadb.EphemeralClient()
    for c in client.list_collections():
        client.delete_collection(c if isinstance(c, str) else c.name)
    col = client.create_collection("docs")
    col.add(
        ids=["a", "b", "c"],
        embeddings=[[1.0, 0.0], [0.0, 1.0], [0.9, 0.1]],
        documents=["alpha doc", "beta doc", "gamma doc"],
        metadatas=[{"lang": "en"}, {"lang": "fr"}, {"lang": "en"}],
    )
    return client


@pytest.fixture()
def client():
    # base_url picks a loopback Host header (the default "testserver" would be
    # rejected by the TrustedHostMiddleware, as any non-local host should be).
    return TestClient(app, base_url="http://127.0.0.1")


@pytest.fixture()
def api(chroma):
    app.dependency_overrides[get_client] = lambda: chroma
    yield TestClient(app, base_url="http://127.0.0.1")
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _clean_session_keys():
    # A mid-test failure must never leak a session key into a later test,
    # where it could unlock a real provider call. Autouse in conftest so no
    # test file has to remember its own manual clears.
    E._session_keys.clear()
    yield
    E._session_keys.clear()


@pytest.fixture()
def conn_env(tmp_path, monkeypatch):
    """Isolate connection config to a temp dir and reset the in-memory store."""
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    from chunklens import connection

    connection.reset()
    yield
    connection.reset()
