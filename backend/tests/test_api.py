from chunklens import connection


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["version"]


def test_list_collections_endpoint(api):
    r = api.get("/api/collections")
    assert r.status_code == 200
    assert r.json() == [{"name": "docs", "count": 3}]


def test_records_endpoint(api):
    r = api.get("/api/collections/docs/records?limit=2&offset=0")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2


def test_records_endpoint_missing_collection_is_404(api):
    r = api.get("/api/collections/nope/records")
    assert r.status_code == 404


def test_query_endpoint(api):
    r = api.post(
        "/api/collections/docs/query",
        json={"query_embedding": [1.0, 0.0], "n_results": 2},
    )
    assert r.status_code == 200
    hits = r.json()["hits"]
    assert hits[0]["id"] == "a"
    assert "distance" in hits[0]


def test_query_endpoint_without_input_is_400(api):
    r = api.post("/api/collections/docs/query", json={"n_results": 2})
    assert r.status_code == 400


def test_query_endpoint_with_metadata_filter(api):
    r = api.post(
        "/api/collections/docs/query",
        json={"query_embedding": [1.0, 0.0], "n_results": 10, "where": {"lang": "en"}},
    )
    assert r.status_code == 200
    ids = {h["id"] for h in r.json()["hits"]}
    assert ids == {"a", "c"}


def test_get_connection_defaults_and_redacts(client, conn_env):
    r = client.get("/api/connection")
    assert r.status_code == 200
    body = r.json()
    assert body["host"] == "localhost"
    assert body["has_token"] is False
    assert "token" not in body


def test_put_connection_persists(client, conn_env):
    r = client.put(
        "/api/connection",
        json={
            "host": "remote",
            "port": 9001,
            "ssl": True,
            "tenant": "t1",
            "database": "d1",
            "auth_mode": "none",
        },
    )
    assert r.status_code == 200
    got = client.get("/api/connection").json()
    assert got["host"] == "remote"
    assert got["port"] == 9001
    assert got["ssl"] is True


def test_put_token_is_stored_but_redacted(client, conn_env):
    r = client.put(
        "/api/connection",
        json={
            "host": "h", "port": 8000, "ssl": False,
            "tenant": "default_tenant", "database": "default_database",
            "auth_mode": "token", "token": "secret",
        },
    )
    assert r.status_code == 200
    assert r.json()["has_token"] is True
    assert "token" not in r.json()
    assert connection.get_active().token == "secret"


def test_put_empty_token_keeps_existing(client, conn_env):
    client.put("/api/connection", json={
        "host": "h", "port": 8000, "ssl": False,
        "tenant": "default_tenant", "database": "default_database",
        "auth_mode": "token", "token": "secret",
    })
    client.put("/api/connection", json={
        "host": "h2", "port": 8000, "ssl": False,
        "tenant": "default_tenant", "database": "default_database",
        "auth_mode": "token",
    })
    assert connection.get_active().host == "h2"
    assert connection.get_active().token == "secret"


def test_put_token_auth_without_token_is_400(client, conn_env):
    r = client.put("/api/connection", json={
        "host": "h", "port": 8000, "ssl": False,
        "tenant": "default_tenant", "database": "default_database",
        "auth_mode": "token",
    })
    assert r.status_code == 400


def test_put_none_auth_clears_token(client, conn_env):
    client.put("/api/connection", json={
        "host": "h", "port": 8000, "ssl": False,
        "tenant": "default_tenant", "database": "default_database",
        "auth_mode": "token", "token": "secret",
    })
    client.put("/api/connection", json={
        "host": "h", "port": 8000, "ssl": False,
        "tenant": "default_tenant", "database": "default_database",
        "auth_mode": "none",
    })
    assert connection.get_active().token is None


def test_test_endpoint_active_ok(client, conn_env, monkeypatch):
    from chunklens import chroma_client

    monkeypatch.setattr(chroma_client, "client_for_config", lambda cfg: "C")
    monkeypatch.setattr(chroma_client, "heartbeat", lambda c: 123)
    r = client.post("/api/connection/test", json=None)
    assert r.status_code == 200
    assert r.json() == {"ok": True, "error": None, "heartbeat_ns": 123}


def test_test_endpoint_candidate_error(client, conn_env, monkeypatch):
    from chunklens import chroma_client

    def boom(cfg):
        raise RuntimeError("refused")

    monkeypatch.setattr(chroma_client, "client_for_config", boom)
    r = client.post(
        "/api/connection/test",
        json={
            "host": "down", "port": 8000, "ssl": False,
            "tenant": "default_tenant", "database": "default_database",
            "auth_mode": "none",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False
    assert "refused" in body["error"]


def test_create_collection_endpoint(api):
    r = api.post(
        "/api/collections",
        json={"name": "new_col", "distance_metric": "cosine", "embedding_function": "none"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "new_col"
    assert body["distance_metric"] == "cosine"
    assert body["embedding_function"] == "none"


def test_create_duplicate_is_409(api):
    api.post("/api/collections", json={"name": "dup2_col"})
    r = api.post("/api/collections", json={"name": "dup2_col"})
    assert r.status_code == 409


def test_create_invalid_name_is_400(api):
    r = api.post("/api/collections", json={"name": "x"})
    assert r.status_code == 400


def test_get_collection_details_endpoint(api):
    r = api.get("/api/collections/docs")
    assert r.status_code == 200
    assert r.json()["name"] == "docs"
    assert r.json()["count"] == 3


def test_get_collection_details_missing_is_404(api):
    r = api.get("/api/collections/missing_col")
    assert r.status_code == 404


def test_patch_rename_collection(api):
    api.post("/api/collections", json={"name": "ren_a"})
    r = api.patch("/api/collections/ren_a", json={"name": "ren_b"})
    assert r.status_code == 200
    assert r.json()["name"] == "ren_b"
    assert api.get("/api/collections/ren_a").status_code == 404
    assert api.get("/api/collections/ren_b").status_code == 200


def test_patch_rename_collision_is_409(api):
    api.post("/api/collections", json={"name": "ren_c"})
    api.post("/api/collections", json={"name": "ren_d"})
    r = api.patch("/api/collections/ren_c", json={"name": "ren_d"})
    assert r.status_code == 409


def test_patch_collection_metadata(api):
    api.post("/api/collections", json={"name": "pm_col", "metadata": {"a": "1"}})
    r = api.patch("/api/collections/pm_col", json={"metadata": {"b": "2"}})
    assert r.status_code == 200
    assert r.json()["metadata"] == {"b": "2"}


def test_delete_collection(api):
    api.post("/api/collections", json={"name": "kill_col"})
    r = api.delete("/api/collections/kill_col")
    assert r.status_code == 204
    assert api.get("/api/collections/kill_col").status_code == 404


def test_delete_missing_is_404(api):
    r = api.delete("/api/collections/never_existed")
    assert r.status_code == 404


def test_patch_record_metadata(api):
    r = api.patch("/api/collections/docs/records/a", json={"metadata": {"lang": "de"}})
    assert r.status_code == 200
    assert r.json()["id"] == "a"
    assert r.json()["metadata"] == {"lang": "de"}


def test_patch_record_metadata_missing_record_is_404(api):
    r = api.patch("/api/collections/docs/records/zzz", json={"metadata": {"x": 1}})
    assert r.status_code == 404


def test_patch_record_metadata_nonscalar_is_422(api):
    r = api.patch("/api/collections/docs/records/a", json={"metadata": {"bad": [1, 2]}})
    assert r.status_code == 422
