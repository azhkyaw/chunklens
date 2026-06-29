from __future__ import annotations

import pytest

import chunklens.embedders as E
from chunklens.embedders import InvalidProvider, MissingDependency, MissingKey


def test_list_embedders_curated_set_and_flags():
    items = {e.id: e for e in E.list_embedders()}
    assert {"openai", "cohere", "ollama", "sentence_transformer"} <= set(items)
    assert items["openai"].needs_key is True
    assert items["ollama"].needs_key is False                 # local HTTP, no key
    assert items["sentence_transformer"].install_extra == "local-embedders"
    # env var is READ from chromadb's EF default, not guessed
    assert items["openai"].env_var == "CHROMA_OPENAI_API_KEY"


def test_resolve_key_session_beats_env(monkeypatch):
    E._session_keys.clear()
    monkeypatch.delenv("CHROMA_OPENAI_API_KEY", raising=False)
    assert E.resolve_key("openai") is None
    monkeypatch.setenv("CHROMA_OPENAI_API_KEY", "env-key")
    assert E.resolve_key("openai") == "env-key"
    E.set_key("openai", "session-key")
    assert E.resolve_key("openai") == "session-key"
    E._session_keys.clear()


def test_embed_missing_key_raises_before_any_network(monkeypatch):
    E._session_keys.clear()
    monkeypatch.delenv("CHROMA_OPENAI_API_KEY", raising=False)
    with pytest.raises(MissingKey):
        E.embed("openai", None, "hello")


def test_embed_missing_dependency(monkeypatch):
    # Deterministic + offline: a registry class whose constructor raises ImportError.
    class _BoomEF:
        def __init__(self, **kwargs):
            raise ImportError("no sdk")

    monkeypatch.setitem(E._efs.known_embedding_functions, "openai", _BoomEF)
    with pytest.raises(MissingDependency):
        E.embed("openai", None, "hello")
    E._session_keys.clear()


def test_embed_unknown_provider():
    with pytest.raises(InvalidProvider):
        E.embed("nope", None, "hello")
