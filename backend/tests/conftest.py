from __future__ import annotations

import chromadb
import pytest
from fastapi.testclient import TestClient

from chunklens.app import app
from chunklens.deps import get_client


@pytest.fixture()
def chroma():
    client = chromadb.EphemeralClient()
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
    return TestClient(app)


@pytest.fixture()
def api(chroma):
    app.dependency_overrides[get_client] = lambda: chroma
    yield TestClient(app)
    app.dependency_overrides.clear()
