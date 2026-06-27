from __future__ import annotations

import json
import os
import stat
from pathlib import Path

from .schemas import ConnectionConfig


def config_dir() -> Path:
    return Path(os.environ.get("CHUNKLENS_HOME", str(Path.home() / ".chunklens")))


def config_path() -> Path:
    return config_dir() / "config.json"


def load_config() -> ConnectionConfig:
    path = config_path()
    if not path.is_file():
        return ConnectionConfig()
    try:
        return ConnectionConfig(**json.loads(path.read_text(encoding="utf-8")))
    except Exception:
        return ConnectionConfig()


def save_config(cfg: ConnectionConfig) -> None:
    config_dir().mkdir(parents=True, exist_ok=True)
    path = config_path()
    path.write_text(json.dumps(cfg.model_dump(), indent=2), encoding="utf-8")
    try:
        os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)  # 0600 (effective on POSIX)
    except OSError:
        pass
