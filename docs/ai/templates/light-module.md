# Template: Light Backend Module

Use for simple CRUD/workflow modules.

## Structure

```txt
module/
  controller/
    thing.controller.ts
    dto/
      create-thing.request.ts
      thing.response.ts

  service/
    thing.service.ts

  repository/
    thing.repository.ts
    thing.mapper.ts
```

Tables live in `packages/database/src/schema/<module>.ts`, not in the module.
Only this module's repositories may query its tables.

## Rules

- Controller parses request and returns response DTO.
- Every route carries `@RequirePermissions("module:resource:action")` or an
  explicit `@PublicRoute()`.
- Service owns simple use case logic; tenant-scoped work runs inside
  `Database.run(...)` (tenant-bound transaction, RLS active).
- Repositories still filter by tenant and apply branch scope
  (`applyBranchScope`) — RLS is the safety net, not the query plan.
- State-changing use cases write `audit.log(...)` in the same transaction and
  publish `DomainEvents` for meaningful facts.
- Service may use Drizzle rows if logic is simple; never return rows as API
  responses.
- Master data uses `deleted_at` soft delete; fact tables are append-only.
- Do not add `domain/` unless business rules start to grow.
