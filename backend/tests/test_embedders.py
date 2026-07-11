from __future__ import annotations

import pytest

import chunklens.embedders as E
from chunklens.embedders import InvalidProvider, MissingDependency, MissingKey, ProviderError


@pytest.fixture(autouse=True)
def _clean_session_keys():
    # A mid-test failure must never leak a session key into a later test,
    # where it could unlock a real provider call. (audit L-6)
    E._session_keys.clear()
    yield
    E._session_keys.clear()


def test_list_embedders_curated_set_and_flags():
    items = {e.id: e for e in E.list_embedders()}
    assert {"openai", "cohere", "ollama", "sentence_transformer"} <= set(items)
    assert items["openai"].needs_key is True
    assert items["ollama"].needs_key is False                 # local HTTP, no key
    assert items["sentence_transformer"].install_extra == "local-embedders"
    # env var is READ from chromadb's EF default, not guessed
    assert items["openai"].env_var == "CHROMA_OPENAI_API_KEY"
    # the provider's DEFAULT model is introspected from the EF signature (offline)
    assert isinstance(items["openai"].default_model, str) and items["openai"].default_model


def test_resolve_key_session_beats_env(monkeypatch):
    monkeypatch.delenv("CHROMA_OPENAI_API_KEY", raising=False)
    assert E.resolve_key("openai") is None
    monkeypatch.setenv("CHROMA_OPENAI_API_KEY", "env-key")
    assert E.resolve_key("openai") == "env-key"
    E.set_key("openai", "session-key")
    assert E.resolve_key("openai") == "session-key"


def test_embed_missing_key_raises_before_any_network(monkeypatch):
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


def test_embed_unknown_provider():
    with pytest.raises(InvalidProvider):
        E.embed("nope", None, "hello")


def test_embed_provider_failure_raises_provider_error(monkeypatch):
    class _FailEF:
        def __init__(self, **kwargs):
            pass

        def __call__(self, texts):
            raise RuntimeError("boom")

    monkeypatch.setitem(E._efs.known_embedding_functions, "openai", _FailEF)
    monkeypatch.setenv("CHROMA_OPENAI_API_KEY", "k")
    with pytest.raises(ProviderError, match="openai embedding failed"):
        E.embed("openai", None, "hello")
