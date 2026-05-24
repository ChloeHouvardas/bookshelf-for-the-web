# ADR 0001: Stack and MVP Boundaries

## Status
Accepted

## Decision
Use React + Vite for the frontend, FastAPI for the backend, SQLModel with SQLite for persistence, `uv` for Python dependencies, and `pnpm` for frontend dependencies.

The MVP is single-user, manual-entry only, and local-first.

## Consequences
- The app can be built quickly without account or hosting decisions.
- The data model stays relational and can later move toward Postgres.
- AI categorization and URL scraping remain additive features instead of core assumptions.

