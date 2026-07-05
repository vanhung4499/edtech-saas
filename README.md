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
  web/
  api/
  worker/

packages/
  database/
  shared/
  ui/
  config/
```

## First Commands

```bash
pnpm install
pnpm dev
```

Local infrastructure:

```bash
docker compose up -d
```

API docs:

```txt
http://localhost:3001/api/docs
http://localhost:3001/api/openapi.json
```
