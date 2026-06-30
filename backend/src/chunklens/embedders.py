from __future__ import annotations

import importlib.util
import inspect
import os
from typing import Optional

from chromadb.utils import embedding_functions as _efs

from .schemas import EmbedderInfo


class EmbedError(Exception):
    """Base for embedder failures; the query router maps these to 400."""


class InvalidProvider(EmbedError):
    pass


class MissingKey(EmbedError):
    pass


class MissingDependency(EmbedError):
    pass


class ProviderError(EmbedError):
    pass


# Curated text-embedding providers we surface. Keys are chromadb registry names
# (== EF.name() == a collection's configuration_json embedding_function name).
# `extra`: the pip extra for the provider's SDK (None = base dep / HTTP-only).
# `sdk_module`: import name to probe for availability (None = HTTP, always present).
_SUPPORTED: dict[str, dict] = {
    "openai": {"label": "OpenAI", "extra": None, "sdk_module": "openai"},
    "cohere": {"label": "Cohere", "extra": None, "sdk_module": "cohere"},
    "voyageai": {"label": "Voyage AI", "extra": None, "sdk_module": "voyageai"},
    "jina": {"label": "Jina", "extra": None, "sdk_module": None},
    "ollama": {"label": "Ollama (local)", "extra": None, "sdk_module": None},
    "sentence_transformer": {
        "label": "Sentence-Transformers (local)",
        "extra": "local-embedders",
        "sdk_module": "sentence_transformers",
    },
}

# Process-lifetime session keys. NEVER persisted to disk.
_session_keys: dict[str, str] = {}


def _cls(provider: str):
    reg = _efs.known_embedding_functions
    if provider not in _SUPPORTED or provider not in reg:
        raise InvalidProvider(f"Unknown embedding provider {provider!r}")
    return reg[provider]


def _params(provider: str):
    return inspect.signature(_cls(provider).__init__).parameters


def _env_var(provider: str) -> Optional[str]:
    p = _params(provider)
    if "api_key_env_var" in p:
        default = p["api_key_env_var"].default
        return default if isinstance(default, str) else None
    return None


def _default_model(provider: str) -> Optional[str]:
    """The provider's default model, read from the EF's `model_name` signature default.
    Signature introspection only - never imports the provider SDK, so it stays offline.
    """
    p = _params(provider)
    if "model_name" in p:
        default = p["model_name"].default
        return default if isinstance(default, str) else None
    return None


def _needs_key(provider: str) -> bool:
    return "api_key" in _params(provider)


def _sdk_available(provider: str) -> bool:
    module = _SUPPORTED[provider]["sdk_module"]
    return module is None or importlib.util.find_spec(module) is not None


def set_key(provider: str, key: str) -> None:
    if provider not in _SUPPORTED:
        raise InvalidProvider(f"Unknown embedding provider {provider!r}")
    _session_keys[provider] = key


def resolve_key(provider: str) -> Optional[str]:
    if provider in _session_keys:
        return _session_keys[provider]
    env = _env_var(provider)
    return os.environ.get(env) if env else None


def list_embedders() -> list[EmbedderInfo]:
    out: list[EmbedderInfo] = []
    for pid, meta in _SUPPORTED.items():
        env = _env_var(pid)
        out.append(
            EmbedderInfo(
                id=pid,
                label=meta["label"],
                needs_key=_needs_key(pid),
                sdk_available=_sdk_available(pid),
                install_extra=meta["extra"],
                env_var=env,
                key_set=pid in _session_keys,
                env_key=bool(env and os.environ.get(env)),
                default_model=_default_model(pid),
            )
        )
    return out


def embed(provider: str, model: Optional[str], text: str) -> list[float]:
    cls = _cls(provider)  # raises InvalidProvider
    params = _params(provider)
    kwargs: dict = {}
    if model and "model_name" in params:
        kwargs["model_name"] = model
    if "api_key" in params:  # provider requires a key
        key = resolve_key(provider)
        if not key:
            raise MissingKey(
                f"Set an API key for {provider} (or export {_env_var(provider)})."
            )
        kwargs["api_key"] = key
    try:
        fn = cls(**kwargs)  # imports the provider SDK here
    except ImportError as exc:
        extra = _SUPPORTED[provider]["extra"]
        hint = f" - install chunklens[{extra}]" if extra else ""
        raise MissingDependency(
            f"Provider {provider!r} needs an extra dependency{hint}."
        ) from exc
    try:
        vectors = fn([text])
    except Exception as exc:  # provider/auth/network failure
        raise ProviderError(f"{provider} embedding failed: {exc}") from exc
    return [float(x) for x in vectors[0]]
