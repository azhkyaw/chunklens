from __future__ import annotations

import os
import threading
import webbrowser

import uvicorn


def main() -> None:
    host = os.environ.get("CHUNKLENS_HOST", "127.0.0.1")
    port = int(os.environ.get("CHUNKLENS_PORT", "8765"))
    if os.environ.get("CHUNKLENS_NO_BROWSER") != "1":
        url = f"http://{host}:{port}"
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    uvicorn.run("chunklens.app:app", host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
