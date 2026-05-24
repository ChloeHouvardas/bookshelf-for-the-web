# Online Bookshelf

A local-first virtual bookshelf for organizing online articles, papers, posts, videos, and tools into books, sections, and tags.

## Stack
- Backend: FastAPI, SQLModel, SQLite, Alembic
- Frontend: React, Vite, TypeScript
- Tooling: `uv` for Python, `pnpm` for frontend packages

## Local Development
Backend:

```powershell
cd backend
python -m venv .venv
uv sync
uv run fastapi dev app/main.py
```

Frontend:

```powershell
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:5173`. The frontend expects the API at `http://localhost:8000` unless `VITE_API_BASE_URL` is set.

## Checks
```powershell
cd backend
uv run ruff check .
uv run mypy app
uv run pytest

cd ../frontend
pnpm lint
pnpm typecheck
pnpm test
```
