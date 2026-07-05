# Technical Documentation v2

| Field      | Value                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Status     | Draft for review                                                       |
| Date       | 2026-07-05                                                             |
| Scope      | Simplified technical source of truth after choosing NestJS and Drizzle |
| Supersedes | `docs/technical/*` for implementation guidance                         |
| Depends on | `docs/business/*`                                                      |

## 1. Purpose

This folder is the simplified technical documentation set for implementation.

The previous `docs/technical` folder was useful during exploration, but it became too broad while the backend direction was still changing.

From this point, implementation decisions should use this folder as the primary technical source of truth.

## 2. Final Technical Direction

The system should be built as:

```txt
Next.js + NestJS
TypeScript monorepo
PostgreSQL
Drizzle ORM
Modular monolith
3-layer by default
Selective domain modeling for heavy modules
Shared TypeScript contracts where useful
```

## 3. Core Documents

Read these documents in order:

1. [01-system-architecture.md](./01-system-architecture.md)
2. [02-module-boundaries.md](./02-module-boundaries.md)
3. [03-backend-conventions.md](./03-backend-conventions.md)
4. [04-data-finance-and-integration.md](./04-data-finance-and-integration.md)
5. [05-implementation-roadmap.md](./05-implementation-roadmap.md)

## 4. Architecture Principles

The v2 architecture follows these principles:

1. Build one modular monolith first.
2. Keep `system` reusable across future projects.
3. Keep `finance` shared across product modules.
4. Use `controller/service/repository` for light modules.
5. Use selective domain modeling only where business complexity deserves it.
6. Avoid microservices, full CQRS, and full DDD ceremony in phase 1.
7. Use Drizzle as persistence/query layer, not as the domain model.

## 5. What This Replaces

This v2 set replaces the old technical-doc sprawl for day-to-day implementation decisions.

The old docs may still be useful as historical notes, but they should not override this folder.

## 6. Current Product Scope

Phase 1 focuses on:

- center management
- academic delivery
- scheduling and resources
- finance
- admissions basics
- reporting basics

Future domains:

- study abroad
- labor export

These future domains should be added as product modules, not folded into the academic module.
