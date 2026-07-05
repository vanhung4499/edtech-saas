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
    tables/
      thing.table.ts
```

## Rules

- Interfaces call application use cases.
- Application owns orchestration and transaction boundary.
- Domain owns business rules, lifecycle, policies, and calculations.
- Infrastructure owns Drizzle tables and SQL.
- Drizzle rows must be mapped before they become domain objects.
