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
