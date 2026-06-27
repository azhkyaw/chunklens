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
