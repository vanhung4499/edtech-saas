# EdTech SaaS

Vietnam-focused SaaS for private education center operations.

## Current Direction

- Frontend: `Next.js`, `React`, `TypeScript`
- Backend: `NestJS`, `TypeScript`
- Database: `PostgreSQL`
- Persistence: `Drizzle ORM`
- Architecture: modular monolith

## Documentation

- Business docs: `docs/business`
- Technical source of truth: `docs/technical`
- AI working guide: `docs/ai`

## Workspace

```txt
apps/
  api/        NestJS backend — HTTP (main.ts) + worker entrypoint (worker.ts)
  web/        Next.js operator console

packages/
  database/   Drizzle schema, client, migrations, seed
  shared/     framework-free logic shared by api and web (e.g. Money)
```

## First Commands

```bash
pnpm install
pnpm dev
```

Create a local `.env` from `.env.example` before running the API.

Local infrastructure:

```bash
docker compose up -d
```

API docs:

```txt
http://localhost:3001/api/docs
http://localhost:3001/api/openapi.json
http://localhost:3001/api/v1/health
```
