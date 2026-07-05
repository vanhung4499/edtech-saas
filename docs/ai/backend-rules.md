# Backend Rules for AI Agents

## Stack

- `NestJS`
- `TypeScript`
- `PostgreSQL`
- `Drizzle ORM`
- modular monolith

## Light Module Pattern

Use this for simple modules:

```txt
module/
  controller/
  service/
  repository/
```

Allowed flow:

```txt
Request -> Service -> Drizzle Row -> Repository -> DB
```

This is acceptable only when logic is mostly CRUD.

## Heavy Module Pattern

Use this for `academic`, `scheduling`, and `finance`:

```txt
module/
  interfaces/
  application/
  domain/
  infrastructure/
```

Preferred flow:

```txt
Request -> Command -> Domain Object / Policy -> Row Snapshot -> Repository -> DB
```

## Drizzle Rules

- Drizzle tables are persistence schema.
- Drizzle rows are persistence records.
- Do not name Drizzle rows `Entity`.
- Do not return Drizzle rows directly as API responses.
- Do not pass Drizzle rows across module boundaries.

## Transaction Rules

- Controllers do not open transactions.
- Light module services may open transactions when needed.
- Heavy module application use cases open transactions.
- Keep transactions short.
- Do not call slow external providers inside transactions.
- Publish downstream events only after commit when possible.

## API Rules

- NestJS DTO classes are the REST API source of truth.
- Use Swagger decorators on request/response DTOs.
- Return normal controller data directly; the global `ResultInterceptor` wraps it as `{ code, message, data, traceId }`.
- Use `AppException` for business/application errors.
- Built-in NestJS exceptions are allowed for generic HTTP errors.
- Keep error codes short and readable, for example `USER_NOT_FOUND`.
- Define module-specific error codes inside the module when needed.

## Event Rules

Use internal events only for downstream reactions:

- reporting refresh
- notification
- invoice provider sync
- payment reconciliation job
- export generation

Do not use events to hide core business workflow.
