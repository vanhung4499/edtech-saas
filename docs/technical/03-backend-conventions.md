# Backend Conventions

| Field      | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| Status     | Active                                                             |
| Date       | 2026-07-06                                                         |
| Scope      | NestJS coding conventions: modules, layers, API, errors, config    |
| Depends on | `01-system-architecture.md`, `02-module-boundaries.md`             |

## 1. Module Shapes

Light modules:

```txt
module/
  controller/
    lead.controller.ts
    dto/
      create-lead.request.ts
      lead.response.ts
  service/
    lead.service.ts
  repository/
    lead.repository.ts
    lead.mapper.ts
```

Table definitions do **not** live in the module: all Drizzle schema lives in
`packages/database/src/schema/<module>.ts` (`05-database-and-migrations.md`).
Ownership is logical — only the owning module's repositories may query its
tables.

Heavy modules (`academic`, `scheduling`, `finance`):

```txt
module/
  interfaces/       controllers, DTOs, webhook/job entrypoints
  application/      use cases, transaction boundaries, orchestration
  domain/           domain objects, value objects, policies, calculators
  infrastructure/   repositories, mappers, provider adapters
```

(Heavy modules follow the same rule: tables live in `packages/database`.)

Layer responsibilities:

| Layer                       | Contains                                            | Never contains                       |
| --------------------------- | --------------------------------------------------- | ------------------------------------ |
| controller / interfaces     | REST controllers, DTOs, input validation            | business rules, SQL, transactions    |
| service / application       | use cases, transactions, permission checks, events  | table definitions                    |
| domain                      | policies, calculators, lifecycle rules              | NestJS decorators, Drizzle anything  |
| repository / infrastructure | queries, mappers, provider adapters                 | cross-module orchestration           |

`domain` exists only where useful. Examples of things that earn it:
`EnrollmentLifecyclePolicy`, `ScheduleConflictPolicy`, `PaymentAllocationPolicy`,
`TeacherSettlementCalculator`, `Money`.

## 2. Naming

| Concept              | Naming                    |
| -------------------- | ------------------------- |
| API request DTO      | `CreateLeadRequest`       |
| API response DTO     | `LeadResponse`            |
| Application command  | `CreateEnrollmentCommand` |
| Drizzle table        | `enrollmentsTable`        |
| Persistence row type | `EnrollmentRow`           |
| Repository           | `EnrollmentRepository`    |
| Domain object        | `Enrollment`              |
| Mapper               | `EnrollmentMapper`        |

Never name a Drizzle row `*Entity`. `Entity` is reserved for domain objects.

## 3. Drizzle Row Usage

Light modules may use rows directly in services when logic is CRUD-simple:

```txt
Request -> Service -> Drizzle Row -> Repository -> DB
```

Heavy modules map rows into domain objects when business rules matter:

```txt
Request -> Command -> Domain Object / Policy -> Row Snapshot -> Repository -> DB
```

Never, in any module:

- a Drizzle row as a public API response
- a Drizzle row crossing a module boundary
- a Drizzle row carrying finance or academic business behavior

## 4. Transactions

All tenant-scoped reads/writes go through the tenant-bound unit of work
(`Database.run(...)`, defined in `04-tenancy-and-data-scope.md`), which opens a
Drizzle transaction with RLS active.

Rules:

1. Controllers never open transactions.
2. Light modules open them in `service`; heavy modules in `application`.
3. Keep transactions short.
4. Never call slow external providers inside a transaction.
5. Publish events after commit.
6. Domain objects must not know about transactions.

## 5. API Contract

- NestJS DTO classes are the source of truth for REST contracts.
- `*.request.ts` / `*.response.ts`, validated with `class-validator`, transformed
  with `class-transformer`, documented with Swagger decorators.
- Common DTOs (pagination, id param, date range) live in `apps/api/src/common/dto`.
- Global prefix `api` + URI versioning; phase-1 routes live under `/api/v1`.
- Swagger UI at `/api/docs`, OpenAPI JSON at `/api/openapi.json`.
- No shared contracts package. No backend domain objects in the frontend.

## 6. Response Shape

Success and failure responses are shaped differently on purpose:

- **Success (2xx):** controllers return the DTO/business data directly — no
  envelope, no wrapping. The response body is exactly the shape of the
  returned data. Document it with plain `@ApiOkResponse({ type: ... })`.
  Never return Drizzle rows as the response.
- **Failure (4xx/5xx):** the global `AppExceptionFilter` wraps every error into
  the same `ResultBody` shape (`{ code, message, data }`), whether it came from
  `AppException` or a built-in Nest `HttpException` — see §7.
- **Trace ID:** not part of either body. Every response (success or failure)
  carries it via the `x-request-id` response header instead — see §8.

## 7. Errors

Use `AppException` for business errors. It takes an `ErrorCode`
(`{ code, message, status }`, see `src/common/exceptions/error-code.ts`) plus
optional `data`; each module declares its own error codes via `defineErrorCodes`
(not a TS `enum` — an `enum` can only hold a primitive, not a bundled
status/message). `defineErrorCodes` derives each entry's `code` from its object
key, so it can never drift from or duplicate another entry's code:

```ts
// modules/system/user/user.errors.ts
export const UserErrorCode = defineErrorCodes({
  USER_NOT_FOUND: { message: "User not found", status: HttpStatus.NOT_FOUND },
  USER_ALREADY_EXISTS: { message: "User already exists", status: HttpStatus.CONFLICT },
});

throw new AppException(UserErrorCode.USER_NOT_FOUND);
throw new AppException(UserErrorCode.USER_ALREADY_EXISTS, { email });
```

Rules:

1. Codes are short and human-readable (`USER_NOT_FOUND`).
2. No global enum of every error code; modules keep local error-code files.
3. Each `ErrorCode` entry carries its own HTTP status; `AppException` just reads it.
4. Built-in NestJS exceptions are fine for generic HTTP errors; the global filter
   normalizes both into the same envelope (`data: null`).
5. Validation errors use `CommonErrorCode.VALIDATION_ERROR`
   (`src/common/exceptions/common-error-code.ts`) with
   `data.fields: [{ field, message }]`.

## 8. Trace ID

Every request has a `traceId`: the API reads `x-request-id` or generates one, and
returns it on the `x-request-id` response header of every response. Failure
bodies also echo it (part of the `AppExceptionFilter` envelope, see §6); success
bodies don't carry it since they're unwrapped. This is the phase-1 debugging
story — no observability stack yet.

## 9. Configuration

1. `ConfigModule` is global; env is validated by the zod schema in
   `apps/api/src/config/server-env.ts`.
2. Feature modules never read `process.env`; use `ConfigService<ServerEnv, true>`.
3. Adding a required env var means updating `server-env.ts` **and** `.env.example`.

## 10. Events

Internal, post-commit, downstream reactions only. Mechanism (buffered
`DomainEvents` facade over `@nestjs/event-emitter` + BullMQ, flushed after
commit) is specified in `10-cross-cutting-conventions.md`.

- good: `EnrollmentCreated` -> reporting refresh; `PaymentRecorded` -> notification;
  `InvoiceIssued` -> provider sync job
- bad: hiding core workflow behind events, or making finance correctness depend on
  eventually-consistent side effects

## 11. Background Jobs

- BullMQ on Redis; processors are `@Processor` providers in feature modules,
  running in-process in `apps/api` by default (`worker.ts` can split them into a
  separate process later).
- Job payloads always carry tenant context and are enqueued via the helper in
  `04-tenancy-and-data-scope.md` — never `queue.add` directly for tenant work.
- Handlers must be idempotent (jobs retry).
- Name queues by module: `finance.invoice-sync`, `reporting.refresh`.

## 12. Testing

- Vitest, colocated `*.spec.ts` next to the code under test.
- `pnpm --filter @edtech/api exec vitest run <path>` for a single file.
- Priorities: domain policies/calculators (pure, cheap to test), tenant isolation
  (mandatory suite in `04-tenancy-and-data-scope.md`), finance math
  (`06-finance.md`), and the common pipeline (interceptor/filter/validation —
  already covered).
