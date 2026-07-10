from __future__ import annotations

from fastapi.testclient import TestClient

from chunklens.app import create_app


def _spa_client(tmp_path) -> TestClient:
    (tmp_path / "index.html").write_text("<!doctype html><title>spa</title>", encoding="utf-8")
    (tmp_path / "known.txt").write_text("static asset", encoding="utf-8")
    return TestClient(create_app(web_dir=tmp_path), base_url="http://127.0.0.1")


def test_deep_link_serves_index(tmp_path):
    r = _spa_client(tmp_path).get("/c/demo/records")
    assert r.status_code == 200
    assert "spa" in r.text


def test_real_static_files_still_served(tmp_path):
    r = _spa_client(tmp_path).get("/known.txt")
    assert r.status_code == 200
    assert r.text == "static asset"


def test_unknown_api_path_stays_404(tmp_path):
    r = _spa_client(tmp_path).get("/api/does-not-exist")
    assert r.status_code == 404


def test_api_routes_still_win(tmp_path):
    r = _spa_client(tmp_path).get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
