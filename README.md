# ChunkLens

The local-first inspector & retrieval debugger for ChromaDB. 🚧 Early / pre-release.

ChunkLens runs entirely on your machine: a small FastAPI backend wraps the official
`chromadb` client and serves a React UI. It binds to `127.0.0.1` only - no telemetry,
no external network calls.

## Prerequisites

- **[uv](https://docs.astral.sh/uv/)** - manages the Python toolchain (it installs the
  right Python for you, so you don't need a system Python).
  - macOS / Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
  - Windows: `irm https://astral.sh/uv/install.ps1 | iex`
- **Node 18+** (for the frontend).

## Setup

```bash
# Backend - uv provisions Python, creates .venv, installs deps + dev tools from uv.lock
cd backend
uv sync
cd ..

# Frontend
cd frontend
npm install
cd ..
```

## Run it

ChunkLens needs a **Chroma server** running, plus the **ChunkLens app**. Start Chroma first.
All backend commands run from `backend/` via `uv run`.

### 1. Start a Chroma server (keep this terminal running)

```bash
cd backend
uv run chroma run --path ../.chroma
```

### 2. (Recommended) Seed demo data

A fresh Chroma is empty, so the UI would show no collections. Seed a small `demo` set
(this downloads an embedding model on first run):

```bash
cd backend
uv run python ../scripts/seed_demo.py
```

### 3. Start ChunkLens - pick one mode

**Production-like** - one process serves the UI *and* the API at a single URL:

```bash
cd frontend
npm run build       # build the UI into the backend (first run, and after any UI change)
cd ../backend
uv run chunklens
```

Open **http://127.0.0.1:8765**.

**Development** - hot-reloading UI (two processes):

```bash
# Terminal A - backend API on :8765
cd backend
uv run chunklens

# Terminal B - Vite dev server (proxies /api to the backend)
cd frontend
npm run dev
```

Open the URL Vite prints (e.g. **http://localhost:5173**) - not :8765.

## Configuration

All optional environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `CHUNKLENS_HOST` / `CHUNKLENS_PORT` | `127.0.0.1` / `8765` | Where ChunkLens serves |
| `CHUNKLENS_CHROMA_HOST` / `CHUNKLENS_CHROMA_PORT` | `localhost` / `8000` | The Chroma server to connect to |
| `CHUNKLENS_NO_BROWSER` | _(unset)_ | Set to `1` to not auto-open a browser |

## Tests

```bash
# Backend
cd backend
uv run pytest

# Frontend unit tests
cd frontend
npm test

# End-to-end (needs the UI built, a running Chroma seeded via scripts/seed_demo.py,
# and chunklens serving; downloads an embedding model on first run)
cd frontend
npm run e2e
```
