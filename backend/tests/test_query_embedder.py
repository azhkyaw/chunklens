from __future__ import annotations

import chunklens.embedders as E
from chunklens.app import app
from chunklens.deps import get_embedder


def test_embedder_produces_query_vector(api):
    # docs is seeded with 2-d embeddings; the fake returns record a's vector.
    app.dependency_overrides[get_embedder] = lambda: (lambda provider, model, text: [1.0, 0.0])
    res = api.post(
        "/api/collections/docs/query",
        json={"query_text": "alpha", "embedder": {"provider": "openai", "model": "m"}, "n_results": 1},
    )
    assert res.status_code == 200
    assert res.json()["hits"][0]["id"] == "a"


def test_raw_embedding_takes_precedence_over_embedder(api):
    def _boom(provider, model, text):
        raise AssertionError("embedder must not be called when query_embedding is given")

    app.dependency_overrides[get_embedder] = lambda: _boom
    res = api.post(
        "/api/collections/docs/query",
        json={"query_embedding": [0.0, 1.0], "embedder": {"provider": "openai"}, "n_results": 1},
    )
    assert res.status_code == 200
    assert res.json()["hits"][0]["id"] == "b"


def test_embedder_missing_key_returns_400(api, monkeypatch):
    # Real embedder (not overridden): openai needs a key; none set -> 400 before any network.
    monkeypatch.delenv("CHROMA_OPENAI_API_KEY", raising=False)
    E._session_keys.clear()
    res = api.post(
        "/api/collections/docs/query",
        json={"query_text": "alpha", "embedder": {"provider": "openai"}, "n_results": 1},
    )
    assert res.status_code == 400
    assert "API key" in res.json()["detail"]
