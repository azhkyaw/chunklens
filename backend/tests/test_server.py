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
