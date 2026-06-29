from chunklens import embedder_hints as H
from chunklens.schemas import ConnectionConfig, EmbedderSpec

CFG = ConnectionConfig(host="localhost", port=8001)


def test_load_missing_returns_none(tmp_path, monkeypatch):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    assert H.load_hint(CFG, "docs") is None


def test_save_then_load_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    H.save_hint(CFG, "docs", EmbedderSpec(provider="openai", model="text-embedding-3-small"))
    got = H.load_hint(CFG, "docs")
    assert got == EmbedderSpec(provider="openai", model="text-embedding-3-small")


def test_load_corrupt_returns_none(tmp_path, monkeypatch):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    (tmp_path / "embedder_hints.json").write_text("{not json", encoding="utf-8")
    assert H.load_hint(CFG, "docs") is None


def test_conn_key_isolates_same_collection_name(tmp_path, monkeypatch):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    other = ConnectionConfig(host="localhost", port=8000)
    H.save_hint(CFG, "docs", EmbedderSpec(provider="openai"))
    assert H.load_hint(other, "docs") is None  # different port -> different key


def test_clear_removes_hint(tmp_path, monkeypatch):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    H.save_hint(CFG, "docs", EmbedderSpec(provider="cohere"))
    H.clear_hint(CFG, "docs")
    assert H.load_hint(CFG, "docs") is None


def test_move_transfers_hint(tmp_path, monkeypatch):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    H.save_hint(CFG, "old", EmbedderSpec(provider="voyageai", model="voyage-3"))
    H.move_hint(CFG, "old", "new")
    assert H.load_hint(CFG, "old") is None
    assert H.load_hint(CFG, "new") == EmbedderSpec(provider="voyageai", model="voyage-3")
