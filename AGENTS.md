# Agent Operating Guide

## Product Goal
Build a local-first virtual bookshelf that can later become a secure hosted web app. The first version is a single-user React + FastAPI app for organizing online resources into books, sections, and tags.

## Engineering Standards
- Prefer small vertical slices over broad rewrites.
- Keep backend and frontend boundaries explicit: FastAPI owns persistence and validation; React owns interaction and presentation.
- Add or update tests for behavior changes.
- Run relevant checks before committing.
- Record product and architecture decisions in `CONTEXT.md` or `docs/adr/`.
- Do not add AI, scraping, auth, or hosting complexity until the MVP workflow is proven.

## Commands
- Backend setup: `cd backend; uv sync`
- Backend dev: `cd backend; uv run fastapi dev app/main.py`
- Backend tests: `cd backend; uv run pytest`
- Backend lint/typecheck: `cd backend; uv run ruff check .; uv run mypy app`
- Frontend setup: `cd frontend; pnpm install`
- Frontend dev: `cd frontend; pnpm dev`
- Frontend tests: `cd frontend; pnpm test`
- Frontend lint/typecheck: `cd frontend; pnpm lint; pnpm typecheck`

## Commit Discipline
- Commit after coherent slices: workflow docs, backend foundation, frontend foundation, MVP behavior, checks/cleanup.
- Use clear imperative commit messages.
- Never revert unrelated user changes.
- Before committing, inspect `git status --short` and stage only intended files.

## Security Posture
- Treat all URLs and text entered by users as untrusted.
- Keep secrets out of the repo. Use environment variables and `.env.example`.
- Do not add external network fetching for URLs until there is a threat model update.
- Keep CORS narrow for local development and document any production change.

