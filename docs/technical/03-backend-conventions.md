# Backend Conventions v2

| Field      | Value                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------- |
| Status     | Draft for review                                                                          |
| Date       | 2026-07-05                                                                                |
| Scope      | NestJS and Drizzle coding conventions for modules, layers, transactions, and model naming |
| Depends on | `01-system-architecture.md`, `02-module-boundaries.md`                                    |

## 1. Purpose

This document defines how backend modules should be coded.

It keeps the architecture simple enough to build, while preventing the core business modules from becoming giant service files.

## 2. Default Module Shape

Use two module shapes.

Light modules should use the direct NestJS 3-layer shape:

```txt
module/
  controller/
  service/
  repository/
```

Heavy modules should use the more explicit shape:

```txt
module/
  interfaces/
  application/
  domain/
  infrastructure/
```

The purpose is practical:

- simple modules should look simple
- heavy modules should have enough structure to keep business rules out of giant service files

## 3. Light Module Pattern

Light modules use direct 3-layer NestJS structure.

```txt
controller -> service -> repository
```

Good candidates:

- `system` subfeatures
- `admissions` v1
- `reporting`
- `document`
- `notification`
- configuration dictionaries

Recommended package shape:

```txt
admissions/
  controller/
    lead.controller.ts
    dto/
      create-lead.request.ts
      lead.response.ts

  service/
    lead.service.ts

  repository/
    lead.repository.ts
    lead.table.ts
    lead.mapper.ts
```

In light modules, `service` may use Drizzle row objects directly.

This is acceptable when:

- logic is mostly CRUD
- there is no complex lifecycle
- there is no money calculation
- there is no important state transition

## 4. Heavy Module Pattern

Heavy modules use selective domain modeling.

```txt
interfaces -> application -> domain -> infrastructure
```

Heavy modules:

- `academic`
- `scheduling`
- `finance`

Use domain objects, policies, or calculators when there is real business weight.

Examples:

- `EnrollmentLifecyclePolicy`
- `ScheduleConflictPolicy`
- `ReceivableGenerationPolicy`
- `PaymentAllocationPolicy`
- `InvoiceIssuancePolicy`
- `TeacherSettlementCalculator`
- `Money`
- `RevenueShareSpec`

## 5. Naming Rules

Use these suffixes consistently:

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

Do not use `Entity` for Drizzle rows.

Reason:

- `Entity` should be reserved for domain objects when the module needs them
- Drizzle rows are persistence records, not business entities

## 6. Layer Responsibilities

## 6.1 Light module layers

### `controller`

Contains:

- REST controllers
- request/response models
- simple input validation

Should not contain:

- business rules
- SQL
- transaction orchestration

### `service`

Contains:

- use case logic
- simple validation
- transaction boundaries
- calls to repositories
- calls to other module services when allowed

This is where explicit Drizzle transactions belong for light modules when the use case needs atomic writes.

### `repository`

Contains:

- Drizzle table definitions
- Drizzle query code
- row-to-domain mappers if needed
- custom SQL when needed

## 6.2 Heavy module layers

### `interfaces`

Contains:

- REST controllers
- request/response models
- webhook handlers later
- job entrypoints if exposed as module handlers

Should not contain:

- business rules
- SQL
- transaction orchestration

### `application`

Contains:

- use case services
- transaction boundaries
- permission checks
- orchestration across repositories/domain policies
- post-commit event publication

This is where explicit Drizzle transactions usually belong for heavy modules.

### `domain`

Only exists where useful.

Contains:

- domain objects
- value objects
- policies
- calculators
- lifecycle/state transition rules

Does not contain:

- NestJS decorators
- Drizzle schema/table definitions
- persistence row objects

### `infrastructure`

Contains:

- Drizzle table definitions
- Drizzle repositories
- SQL helpers
- external provider adapters
- persistence converters

Should not contain:

- high-level business orchestration
- cross-module workflow logic

## 7. Transaction Rules

Use explicit Drizzle transactions at service/application boundaries.

For light modules, this usually means `service`.

For heavy modules, this usually means `application`.

Example:

```ts
export class CreateEnrollment {
  constructor(private readonly db: Db) {}

  async execute(command: CreateEnrollmentCommand) {
    return this.db.transaction(async (tx) => {
      // validate, create enrollment, create finance basis, write audit
      return enrollmentId;
    });
  }
}
```

Rules:

1. Do not open transactions in controllers.
2. Keep transactions short.
3. Do not call slow external providers inside transactions.
4. Publish events after commit when possible.
5. Avoid nested transactions unless there is a deliberate reason.
6. Domain objects must not know about Drizzle transactions.

## 8. Drizzle Row Usage Rule

Light modules may use Drizzle row objects inside services.

Heavy modules should not treat Drizzle row objects as domain models.

Allowed:

```txt
Request -> Service -> Drizzle Row -> Repository -> DB
```

for light modules.

Preferred for heavy modules:

```txt
Request -> Command -> Domain Object / Policy -> Row Snapshot -> Repository -> DB
```

Never allow:

- Drizzle row as public API response contract
- Drizzle row crossing module boundary
- Drizzle row carrying finance or academic business behavior

## 9. Event Rule

Use internal events only for downstream reactions.

Good:

- `EnrollmentCreated` refreshes reporting
- `PaymentRecorded` sends notification
- `InvoiceIssued` starts provider sync job

Avoid:

- using events as a way to hide core business workflow
- making finance correctness depend on eventually consistent side effects

## 10. API Contract Rule

Frontend should consume generated TypeScript clients/types from OpenAPI.

NestJS DTO classes are the source of truth for REST request/response contracts.

Do not create a shared request/response contracts package for normal REST APIs.

Do not share backend domain objects with frontend.

API contracts are separate from:

- domain objects
- Drizzle rows
- database schema

## 11. Result Rule

All normal API responses are wrapped by the global `ResultInterceptor`:

```json
{
  "code": "SUCCESS",
  "message": "Success",
  "data": {},
  "traceId": "request-id"
}
```

Controllers should return business data directly in most cases.

If a use case needs a custom success code/message, return a `ResultBody`-shaped object:

```ts
return {
  code: "TENANT_CREATED",
  message: "Tenant created",
  data: tenant,
};
```

Do not return Drizzle rows directly as public response data.

## 12. Exception Rule

Use `AppException` for application/business errors.

Examples:

```ts
throw AppException.notFound("USER_NOT_FOUND", "User not found");
throw AppException.conflict("ENROLLMENT_ALREADY_ACTIVE", "Enrollment already active");
```

Rules:

1. Error codes should be short and human-readable, such as `USER_NOT_FOUND`.
2. Do not create one global enum containing every module error code.
3. Each module may define its own local error-code file when it has enough errors.
4. `AppException` must carry the correct HTTP status.
5. Built-in NestJS exceptions are allowed for generic HTTP errors.
6. The global exception filter wraps both `AppException` and NestJS exceptions into the same response shape.

Error response shape:

```json
{
  "code": "USER_NOT_FOUND",
  "message": "User not found",
  "data": null,
  "traceId": "request-id"
}
```

Validation errors use:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "data": {
    "fields": [{ "field": "email", "message": "email must be an email" }]
  },
  "traceId": "request-id"
}
```

## 13. Trace ID Rule

Every request has a `traceId`.

The API reads `x-request-id` when provided. Otherwise, it generates a new id and returns it in both the `x-request-id` response header and response body.

Use `traceId` for support/debugging:

- user reports an error
- frontend sends the trace id to support
- backend logs can later be searched by the same id

This is intentionally lightweight. Do not introduce a full observability stack in phase 1.

## 14. DTO and OpenAPI Rule

NestJS DTO classes are the source of truth for REST request/response contracts.

Use:

- `*.request.ts` for request/query/param/body DTOs
- `*.response.ts` for response DTOs
- `class-validator` for validation
- `class-transformer` for query/body transformation
- Swagger decorators for OpenAPI schema

Common DTOs live under `apps/api/src/common/dto`.

Swagger UI:

```txt
/api/docs
```

OpenAPI JSON:

```txt
/api/openapi.json
```

## 15. Configuration Rule

The API uses NestJS `ConfigModule` as a global module.

Rules:

1. Do not read `process.env` directly in feature modules.
2. Add API runtime env variables to `apps/api/src/config/server-env.ts`.
3. Keep `.env.example` updated whenever a required env variable is added.
4. Commit `.env.example`, but never commit real `.env` files.
5. Read config values through `ConfigService<ServerEnv, true>`.

Local env files are loaded from:

```txt
../../.env.local
../../.env
.env.local
.env
```

This allows running the API from either the repo root or the app folder.
