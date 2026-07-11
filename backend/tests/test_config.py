import sys

import pytest

from chunklens import config
from chunklens.schemas import ConnectionConfig


def test_load_returns_defaults_when_absent(tmp_path, monkeypatch):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    cfg = config.load_config()
    assert cfg == ConnectionConfig()


def test_save_then_load_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    config.save_config(ConnectionConfig(host="h", port=1234, auth_mode="token", token="t"))
    cfg = config.load_config()
    assert cfg.host == "h"
    assert cfg.port == 1234
    assert cfg.auth_mode == "token"
    assert cfg.token == "t"


def test_load_corrupt_returns_defaults(tmp_path, monkeypatch):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    (tmp_path / "config.json").write_text("{not json", encoding="utf-8")
    assert config.load_config() == ConnectionConfig()


def test_corrupt_config_warns_and_falls_back(tmp_path, monkeypatch, caplog):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    (tmp_path / "config.json").write_text("{not json", encoding="utf-8")
    with caplog.at_level("WARNING", logger="chunklens.config"):
        cfg = config.load_config()
    assert cfg == ConnectionConfig()
    assert any("config" in r.message.lower() for r in caplog.records)


@pytest.mark.skipif(sys.platform == "win32", reason="0600 perms are a POSIX guarantee")
def test_save_sets_0600_perms(tmp_path, monkeypatch):
    monkeypatch.setenv("CHUNKLENS_HOME", str(tmp_path))
    config.save_config(ConnectionConfig())
    mode = (tmp_path / "config.json").stat().st_mode & 0o777
    assert mode == 0o600
