# Template: Heavy Backend Module

Use for `academic`, `scheduling`, and `finance`.

## Structure

```txt
module/
  interfaces/
    http/
      thing.controller.ts
      dto/

  application/
    commands/
      do-business-action.ts
    queries/
      list-things.ts

  domain/
    thing.ts
    thing-status.ts
    thing-policy.ts

  infrastructure/
    repositories/
      thing.repository.ts
    mappers/
      thing.mapper.ts
```

Tables live in `packages/database/src/schema/<module>.ts`, not in the module.
Only this module's repositories may query its tables.

## Rules

- Interfaces call application use cases; every route carries
  `@RequirePermissions(...)` or `@PublicRoute()`.
- Application owns orchestration and the transaction boundary
  (`Database.run(...)`), writes `audit.log(...)` in the same transaction, and
  publishes `DomainEvents` (flushed after commit).
- Domain owns business rules, lifecycle, policies, and calculations — pure
  code: no NestJS decorators, no Drizzle, no transactions, `Money` for all
  amounts.
- Infrastructure owns repositories, mappers, and provider adapters.
- Drizzle rows must be mapped before they become domain objects; rows never
  cross the module boundary.
- Finance money records reference origins via the charge basis, never direct
  FKs into product-module tables.
