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
