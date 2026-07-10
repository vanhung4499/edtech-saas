# Implementation Roadmap

| Field      | Value                                                  |
| ---------- | ------------------------------------------------------ |
| Status     | Active                                                 |
| Date       | 2026-07-06                                             |
| Scope      | Build order for the first production version           |
| Depends on | all other docs in this folder                          |

## 1. Build Principle

Build the smallest serious center operating system first. No study abroad, no
labor export, no generic framework before the product breathes.

Each phase has an exit condition. Do not start the next phase's modules before
the current exit is real.

## 2. Phase 0: Foundation — mostly done

Done:

- pnpm + Turborepo monorepo, apps (api/web/worker) and packages scaffolded
- Docker Postgres + Redis, Drizzle migrations + seed
- API foundation: result envelope, `AppException` + filter, validation pipeline,
  request-id/traceId, OpenAPI, URI versioning, zod config

Remaining:

- CI running `typecheck`, `lint`, `test` on push

## 3. Phase 1: Tenancy, Auth, and System

The current phase. Order inside the phase matters:

1. **Tenancy enforcement** (`04-tenancy-and-data-scope.md`): column helpers,
   runtime role split, RLS migrations, `TenantContext`, `withTenant` +
   `Database` provider, isolation tests.
2. **Auth + RBAC** (`09-auth-and-authorization.md`, `docs/plans/auth-rbac.md`):
   Redis sessions, login/lockout/login-log, permission registry + guards,
   user-level data scope, module entitlement.
3. **System module**: user, role, permission, data scope, person, branch CRUD,
   audit log, file metadata; config/dictionary if needed.
4. **Money hardening** (`06-finance.md`): integer-VND `Money` in
   `@edtech/shared` with allocation policy + tests (cheap now, needed by every
   later phase).
5. **OpenAPI client generation** wired into `apps/web` (`07-frontend.md`).

Exit: users log in; roles and branch/data scope restrict access; two-tenant
isolation tests pass in CI; business modules can depend on `system`.

## 4. Phase 2: Academic Core

Design: `14-academic.md`. Program → optional ProgramLevel → class (config axes:
delivery_mode ONSITE, class_type cohort/rolling, sourcing); enrollment lifecycle
(with optional TRIAL/RESERVED); both onboarding paths incl. bulk enrollment;
transfer / hold / resume / completion / progression as events; primary teacher
assignment; capacity + roster. Attendance + makeup land at the phase 2/3 boundary
(need scheduling sessions).

Exit: a center can create classes and enroll learners (funnel and bulk); the two
models — language cohort and extra-study rolling — both run on the same core;
academic participation truth is unambiguous.

## 5. Phase 3: Scheduling Core

Design: `15-scheduling.md`. Room + capacity; recurring schedule (wall-clock) →
session generation (bounded for cohort, pre-generated to a horizon for continuous;
known holidays skipped, the rest handled by cancel + makeup); session occurrence
(held/rescheduled/cancelled, actual teacher/room); advisory conflict detection
(room/capacity warning; optional teacher); reschedule, cancel (incl. bulk cancel
by date), class- and learner-level makeup, substitute teacher. Attendance
(academic) is recorded against sessions once these exist.

Exit: the class-centric schedule is controlled by the system; conflicts surface
as advisory warnings operators can override; both cohort and rolling classes
pre-generate sessions correctly.

## 6. Phase 4: Finance Core

Money in (`11-billing.md`): pricing rule, financial terms, billing run,
receivable, payment, cash application, credit balance, invoice records.
Money out (`12-settlement-and-payables.md`): teacher commercial terms +
settlement run (fixed / per-session / revenue-share), expense, payable, payout.

Exit: a center can bill, collect (cash/transfer/VietQR), track debt, record
expenses, settle teachers, and issue invoice records — with the finance test
suites from `06-finance.md`, `11-billing.md`, and `12-settlement-and-payables.md`
green.

## 7. Phase 5: Admissions Basics

Design: `16-admissions.md` (light, optional). Lead + source channel + funnel
stage (prospect = a stage, not a table); consultation; optional placement →
recommended level (language only); promotion offer; conversion → person + academic
enrollment + finance terms. Teacher-led largely skips it (source on enrollment).
Plus the `tasks` light module (first consumer: lead follow-ups with assignee + due
date; finance collection tasks reuse it).

Exit: a simple admissions pipeline converts into academic + finance, with
follow-up tasks assignable and trackable.

## 8. Phase 6: Reporting and Control

Design: `17-reporting.md` (light, downstream, read-only). Live tenant + branch-
scoped queries/views: active learners, class fill, utilization, revenue by
branch/program/class, AR aging, collection rate, settlement/expense summaries,
and the branch P&L (collected − settlement − expenses). CSV/Excel export.

Exit: managers run day-to-day operational and financial control from the system,
scoped to their branches.

## 9. Phase 7: First-Customer Hardening

Audit review, backup/restore check, seed/import tools, permission matrix review,
finance edge-case review, support/debug affordances.

Exit: the first customer runs real operations with acceptable support risk.

## 10. Deferred

Parent portal, mobile app, LMS features, study-abroad workflow, labor-export
workflow, payment gateway automation, full accounting ledger, plugin
architecture, microservices.
