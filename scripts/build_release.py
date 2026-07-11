#!/usr/bin/env python
"""Build a ChunkLens release and verify the SPA shipped inside the wheel.

Run from the repo root:  uv run --project backend python scripts/build_release.py
(uv provides Python; `npm` and `uv` must be on PATH.)

Steps: build the SPA -> guard that it exists -> build wheel+sdist ->
assert the SPA is inside the wheel (offline zip inspection) -> report.
"""
from __future__ import annotations

import fnmatch
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
BACKEND = ROOT / "backend"
WEB_INDEX = BACKEND / "src" / "chunklens" / "web" / "index.html"
DIST = BACKEND / "dist"


def _run(cmd: list[str], cwd: Path | None = None) -> None:
    exe = shutil.which(cmd[0])
    if not exe:  # resolves npm -> npm.cmd on Windows
        sys.exit(f"FAILED: {cmd[0]!r} not found on PATH")
    print(f"$ {' '.join(cmd)}")
    if subprocess.run([exe, *cmd[1:]], cwd=cwd).returncode != 0:
        sys.exit(f"FAILED: {cmd[0]} (see output above)")


def main() -> None:
    # 0. Clean dist/ so a rebuild can never leave stale artifacts for the
    #    publish hint below to pick up.
    if DIST.exists():
        shutil.rmtree(DIST)

    # 1. Build the SPA into backend/src/chunklens/web/
    _run(["npm", "--prefix", str(FRONTEND), "run", "build"])

    # 2. Guard: never pack a wheel without the SPA.
    if not WEB_INDEX.is_file():
        sys.exit(f"FAILED: SPA not built - missing {WEB_INDEX}")

    # 3. Build wheel + sdist into backend/dist/.
    _run(["uv", "build"], cwd=BACKEND)

    # 4. Verify the SPA actually shipped inside the wheel (offline).
    wheels = sorted(DIST.glob("*.whl"), key=lambda p: p.stat().st_mtime)
    if not wheels:
        sys.exit("FAILED: no wheel produced in backend/dist/")
    wheel = wheels[-1]
    names = zipfile.ZipFile(wheel).namelist()
    if "chunklens/web/index.html" not in names:
        sys.exit(f"FAILED: chunklens/web/index.html missing from {wheel.name}")
    if not any(fnmatch.fnmatch(n, "chunklens/web/assets/*.js") for n in names):
        sys.exit(f"FAILED: no chunklens/web/assets/*.js in {wheel.name}")

    # 5. Report.
    sdists = sorted(DIST.glob("*.tar.gz"), key=lambda p: p.stat().st_mtime)
    print("\nOK - SPA verified inside the wheel.")
    print(f"  wheel: {wheel}")
    if sdists:
        print(f"  sdist: {sdists[-1]}")
    print("\n# To publish later (needs a PyPI token):")
    print("#   uv publish backend/dist/*")


if __name__ == "__main__":
    main()
