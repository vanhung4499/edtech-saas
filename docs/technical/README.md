# Technical Documentation v3

| Field      | Value                                                          |
| ---------- | -------------------------------------------------------------- |
| Status     | Active                                                         |
| Date       | 2026-07-06                                                     |
| Scope      | Technical source of truth for implementation                   |
| Supersedes | All previous `docs/technical` versions                         |
| Depends on | `docs/business/*`                                              |

## 1. Purpose

This folder is the single technical source of truth for implementing the platform.

It was rewritten from scratch after the foundation code landed (monorepo, NestJS API
skeleton, database package) so that every document describes the system as it is
being built, not as it was explored.

If a document here conflicts with code, fix one of them in the same change.
Do not let them drift.

## 2. Final Direction

```txt
Next.js + NestJS
TypeScript monorepo (pnpm + Turborepo)
PostgreSQL + Drizzle ORM
Modular monolith
Shared-schema multi-tenancy, enforced by app context + Postgres RLS
3-layer modules by default, selective domain modeling for heavy modules
NestJS DTOs -> OpenAPI -> generated frontend client/types
Redis + BullMQ for background jobs
Integer-VND money model
```

## 3. Document Map

Read in order. Each document answers one question.

| Doc                                                              | Question it answers                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| [01-system-architecture.md](./01-system-architecture.md)         | What are we building on, and why?                    |
| [02-module-boundaries.md](./02-module-boundaries.md)             | Which module owns which business truth?              |
| [03-backend-conventions.md](./03-backend-conventions.md)         | How is backend code written?                         |
| [04-tenancy-and-data-scope.md](./04-tenancy-and-data-scope.md)   | How are tenants isolated and data access scoped?     |
| [05-database-and-migrations.md](./05-database-and-migrations.md) | How are schema, migrations, and queries handled?     |
| [06-finance.md](./06-finance.md)                                 | How is money represented, moved, and integrated?     |
| [07-frontend.md](./07-frontend.md)                               | Frontend architecture: rendering, data, auth, tables, design tokens |
| [08-roadmap.md](./08-roadmap.md)                                 | What gets built in which order?                      |
| [09-auth-and-authorization.md](./09-auth-and-authorization.md)   | How do users log in, and what may they do and see?   |
| [10-cross-cutting-conventions.md](./10-cross-cutting-conventions.md) | Events, audit, deletion, time, language — the shared rules |
| [11-billing.md](./11-billing.md)                                 | How does participation become money the center collects? |
| [12-settlement-and-payables.md](./12-settlement-and-payables.md) | How does the center pay teachers, costs, and payables?   |
| [13-reconciliation.md](./13-reconciliation.md)                   | How do incoming bank transfers get matched to receivables? |
| [14-academic.md](./14-academic.md)                               | How are programs, classes, and enrollments modeled?      |
| [15-scheduling.md](./15-scheduling.md)                           | When/where do classes run, and can they run at all?      |
| [16-admissions.md](./16-admissions.md)                           | How do leads enter the funnel and convert to enrollment? |
| [17-reporting.md](./17-reporting.md)                             | How do operators see operational + financial control?    |

## 4. Relationship to Other Docs

- `docs/business/*` is upstream. It defines business truth: contexts, objects,
  workflows, rules. Technical docs must preserve those rules, never redefine them.
- `docs/ai/*` is the short operational guide for AI-assisted coding. It summarizes;
  this folder decides.
- `AGENTS.md` and `CLAUDE.md` point here. Keep their references valid when renaming.

## 5. Core Principles

1. One modular monolith. No microservices in phase 1.
2. Tenant isolation is absolute and enforced at two layers (app context + RLS).
3. `system` stays reusable across future SaaS products; it owns no education concepts.
4. `finance` is a shared money module; future product modules plug into it.
5. Light modules stay simple (`controller -> service -> repository`).
6. Heavy modules (`academic`, `scheduling`, `finance`) earn domain modeling.
7. Drizzle rows are persistence records, never domain entities or API responses.
8. NestJS DTOs are the API contract; the frontend consumes generated types.
9. Money is integer VND. No floating-point arithmetic on money, ever.
10. Reporting is downstream and read-only. Events are post-commit reactions only.
