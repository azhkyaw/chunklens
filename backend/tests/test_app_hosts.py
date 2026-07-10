from __future__ import annotations

from fastapi.testclient import TestClient

from chunklens.app import create_app


def test_rejects_untrusted_host_header(client):
    # A DNS-rebinding page reaches the API with a non-local Host header.
    r = client.get("/api/health", headers={"host": "evil.example.com"})
    assert r.status_code == 400


def test_accepts_loopback_hosts(client):
    for host in ("127.0.0.1:8765", "localhost:8765", "localhost"):
        assert client.get("/api/health", headers={"host": host}).status_code == 200


def test_off_loopback_bind_allows_any_host(monkeypatch):
    # Binding off-loopback is an explicit opt-out (the launcher warns); requests
    # then arrive with the machine's real hostname or LAN IP and must not 400.
    monkeypatch.setenv("CHUNKLENS_HOST", "0.0.0.0")
    api = TestClient(create_app(), base_url="http://127.0.0.1")
    assert api.get("/api/health", headers={"host": "192.168.1.20:8765"}).status_code == 200
