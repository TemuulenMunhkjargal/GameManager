# GameHall development rules

- Every behavior change or bug fix must include or update automated tests.
- Run `npm test`, `npm run typecheck`, and `npm run build` before considering a change complete.
- Persistence changes must include a migration-compatible initialization path and an integration test using a temporary SQLite database.
- Never use the user's live `.gamehall/gamehall.db` in tests. Use an in-memory or temporary database.
- Preserve local-first operation: no feature may require an account or remote service for core functionality.
