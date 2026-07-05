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

Frontend should consume generated TypeScript clients/types from OpenAPI or a shared contracts package.

Do not share backend domain objects with frontend.

API contracts are separate from:

- domain objects
- Drizzle rows
- database schema
