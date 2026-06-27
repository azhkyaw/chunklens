from chunklens import chroma_client, config, connection
from chunklens.schemas import ConnectionConfig


def test_get_active_loads_from_config(monkeypatch):
    connection.reset()
    monkeypatch.setattr(config, "load_config", lambda: ConnectionConfig(host="loaded"))
    assert connection.get_active().host == "loaded"


def test_set_active_persists_and_invalidates(monkeypatch):
    saved = {}
    monkeypatch.setattr(config, "save_config", lambda cfg: saved.update({"cfg": cfg}))
    monkeypatch.setattr(config, "load_config", lambda: ConnectionConfig())

    builds = {"n": 0}

    def fake_build(cfg):
        builds["n"] += 1
        return f"client-{builds['n']}"

    monkeypatch.setattr(chroma_client, "client_for_config", fake_build)
    connection.reset()

    c1 = connection.get_active_client()
    c2 = connection.get_active_client()
    assert c1 == c2 == "client-1"  # cached, built once

    connection.set_active(ConnectionConfig(host="other"))
    assert saved["cfg"].host == "other"
    assert connection.get_active().host == "other"

    c3 = connection.get_active_client()
    assert c3 == "client-2"  # rebuilt after invalidation
