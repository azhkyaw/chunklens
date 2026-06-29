from __future__ import annotations

import json
import os
import stat
from typing import Optional

from .config import config_dir
from .schemas import ConnectionConfig, EmbedderSpec


def hints_path():
    return config_dir() / "embedder_hints.json"


def conn_key(cfg: ConnectionConfig) -> str:
    return f"{cfg.host}:{cfg.port}/{cfg.tenant}/{cfg.database}"


def _load_all() -> dict:
    path = hints_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_all(data: dict) -> None:
    config_dir().mkdir(parents=True, exist_ok=True)
    path = hints_path()
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    try:
        os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)  # 0600 (effective on POSIX)
    except OSError:
        pass


def load_hint(cfg: ConnectionConfig, name: str) -> Optional[EmbedderSpec]:
    entry = _load_all().get(conn_key(cfg), {}).get(name)
    if not isinstance(entry, dict) or "provider" not in entry:
        return None
    return EmbedderSpec(provider=entry["provider"], model=entry.get("model"))


def save_hint(cfg: ConnectionConfig, name: str, spec: EmbedderSpec) -> None:
    data = _load_all()
    data.setdefault(conn_key(cfg), {})[name] = {"provider": spec.provider, "model": spec.model}
    _save_all(data)


def clear_hint(cfg: ConnectionConfig, name: str) -> None:
    data = _load_all()
    bucket = data.get(conn_key(cfg))
    if bucket and name in bucket:
        del bucket[name]
        _save_all(data)


def move_hint(cfg: ConnectionConfig, old: str, new: str) -> None:
    spec = load_hint(cfg, old)
    if spec is not None:
        save_hint(cfg, new, spec)
        clear_hint(cfg, old)
