from __future__ import annotations

from chunklens import connection, embedder_hints


def test_put_then_details_returns_hint(api, conn_env):
    r = api.put("/api/collections/docs/embedder", json={"provider": "openai", "model": "text-embedding-3-small"})
    assert r.status_code == 204
    d = api.get("/api/collections/docs").json()
    assert d["embedder_hint"] == {"provider": "openai", "model": "text-embedding-3-small"}


def test_details_hint_none_when_unset(api, conn_env):
    d = api.get("/api/collections/docs").json()
    assert d["embedder_hint"] is None


def test_delete_clears_hint(api, conn_env):
    api.put("/api/collections/docs/embedder", json={"provider": "cohere"})
    assert api.delete("/api/collections/docs/embedder").status_code == 204
    assert api.get("/api/collections/docs").json()["embedder_hint"] is None


def test_put_unknown_provider_400(api, conn_env):
    r = api.put("/api/collections/docs/embedder", json={"provider": "not-a-provider"})
    assert r.status_code == 400


def test_rename_moves_hint(api, conn_env):
    api.put("/api/collections/docs/embedder", json={"provider": "openai", "model": "m"})
    assert api.patch("/api/collections/docs", json={"name": "docs2"}).status_code == 200
    assert api.get("/api/collections/docs2").json()["embedder_hint"] == {"provider": "openai", "model": "m"}


def test_delete_collection_clears_hint(api, conn_env):
    api.put("/api/collections/docs/embedder", json={"provider": "openai"})
    assert api.delete("/api/collections/docs").status_code == 204
    assert embedder_hints.load_hint(connection.get_active(), "docs") is None
