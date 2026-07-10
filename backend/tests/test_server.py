import os
from unittest import mock

from chunklens import server


def test_main_binds_localhost_and_respects_no_browser():
    with mock.patch.object(server.uvicorn, "run") as run, \
         mock.patch.dict(os.environ, {"CHUNKLENS_NO_BROWSER": "1"}):
        server.main()
    args, kwargs = run.call_args
    assert kwargs["host"] == "127.0.0.1"
    assert kwargs["port"] == 8765


def test_main_warns_when_binding_off_loopback(capsys):
    with mock.patch.object(server.uvicorn, "run") as run, \
         mock.patch.dict(os.environ, {
             "CHUNKLENS_NO_BROWSER": "1",
             "CHUNKLENS_HOST": "0.0.0.0",
             "CHUNKLENS_PORT": "9001",
         }):
        server.main()
    args, kwargs = run.call_args
    assert kwargs["host"] == "0.0.0.0"
    assert kwargs["port"] == 9001
    err = capsys.readouterr().err
    assert "no authentication" in err.lower()


def test_main_does_not_warn_on_loopback(capsys):
    with mock.patch.object(server.uvicorn, "run"), \
         mock.patch.dict(os.environ, {"CHUNKLENS_NO_BROWSER": "1"}):
        server.main()
    assert "no authentication" not in capsys.readouterr().err.lower()
