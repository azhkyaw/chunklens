from __future__ import annotations

import os
import sys
import threading
import webbrowser

import uvicorn

_LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


def main() -> None:
    host = os.environ.get("CHUNKLENS_HOST", "127.0.0.1")
    port = int(os.environ.get("CHUNKLENS_PORT", "8765"))
    if host not in _LOOPBACK_HOSTS:
        print(
            f"WARNING: binding to {host!r} instead of loopback. The ChunkLens API "
            "has no authentication; anyone who can reach this address can read "
            "and modify your Chroma data. Unset CHUNKLENS_HOST to stay local.",
            file=sys.stderr,
        )
    if os.environ.get("CHUNKLENS_NO_BROWSER") != "1":
        url = f"http://{host}:{port}"
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    uvicorn.run("chunklens.app:app", host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
