from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from chunklens.app import app
from chunklens.deps import get_client


class _BrokenClient:
    """Simulates the Chroma server being unreachable mid-session."""

    def get_collection(self, name):
        raise RuntimeError("connection to chroma at localhost:8000 lost")


@pytest.fixture()
def broken_api():
    app.dependency_overrides[get_client] = lambda: _BrokenClient()
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


def test_records_on_missing_collection_is_404(api):
    r = api.get("/api/collections/nope/records")
    assert r.status_code == 404


def test_query_on_missing_collection_is_404(api):
    r = api.post("/api/collections/nope/query", json={"query_embedding": [1.0, 0.0]})
    assert r.status_code == 404


def test_sources_on_missing_collection_is_404(api):
    r = api.get("/api/collections/nope/sources", params={"key": "lang"})
    assert r.status_code == 404


def test_malformed_where_filter_is_400_not_404(api):
    r = api.post(
        "/api/collections/docs/query",
        json={"query_embedding": [1.0, 0.0], "where": {"lang": {"$bogus": "en"}}},
    )
    assert r.status_code == 400


def test_records_transport_failure_is_500_not_404(broken_api):
    r = broken_api.get("/api/collections/docs/records")
    assert r.status_code == 500
    # A transport failure must not leak internals (host/port) to the client.
    assert "localhost:8000" not in r.text


def test_query_transport_failure_is_500_not_404(broken_api):
    r = broken_api.post("/api/collections/docs/query", json={"query_embedding": [1.0, 0.0]})
    assert r.status_code == 500
    assert "localhost:8000" not in r.text


def test_sources_transport_failure_is_500_not_404(broken_api):
    r = broken_api.get("/api/collections/docs/sources", params={"key": "lang"})
    assert r.status_code == 500
