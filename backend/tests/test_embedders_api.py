from __future__ import annotations

import chunklens.embedders as E


def test_list_embedders_endpoint(client):
    res = client.get("/api/embedders")
    assert res.status_code == 200
    ids = {e["id"] for e in res.json()}
    assert {"openai", "ollama", "sentence_transformer"} <= ids


def test_set_key_is_write_only(client):
    E._session_keys.clear()
    res = client.post("/api/embedders/openai/key", json={"token": "super-secret"})
    assert res.status_code == 204
    listing = client.get("/api/embedders")
    info = {e["id"]: e for e in listing.json()}
    assert info["openai"]["key_set"] is True
    assert "super-secret" not in listing.text  # key is never returned
    E._session_keys.clear()


def test_set_key_unknown_provider(client):
    res = client.post("/api/embedders/nope/key", json={"token": "x"})
    assert res.status_code == 404
