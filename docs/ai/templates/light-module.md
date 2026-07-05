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
    thing.table.ts
    thing.mapper.ts
```

## Rules

- Controller parses request and returns response DTO.
- Service owns simple use case logic and transaction if needed.
- Repository owns Drizzle queries.
- Service may use Drizzle rows if logic is simple.
- Do not add `domain/` unless business rules start to grow.
