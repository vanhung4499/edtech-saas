# Task Checklist for AI Agents

## Before Coding

1. Read `AGENTS.md`.
2. Read `docs/ai/project-brief.md`.
3. Read `docs/technical/README.md`.
4. Identify the target module.
5. Decide whether the target module is light or heavy.
6. Follow the matching template in `docs/ai/templates/`.

## During Coding

- Keep changes scoped.
- Preserve module boundaries.
- Avoid unrelated refactors.
- Add domain objects only when there is real business logic.
- Keep Drizzle rows out of API responses.
- Keep frontend screens consistent with `frontend-rules.md`.

## Before Finishing

Run the most relevant available checks:

```txt
pnpm typecheck
pnpm lint
pnpm test
```

If scripts do not exist yet:

- read back changed docs/files
- verify paths and references
- say that automated checks are not available yet
