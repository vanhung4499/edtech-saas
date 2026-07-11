# Cross-Cutting Conventions

| Field      | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| Status     | Active                                                             |
| Date       | 2026-07-06                                                         |
| Scope      | Domain events, audit log, record lifecycle, time, language         |
| Depends on | `03-backend-conventions.md`, `04-tenancy-and-data-scope.md`, `05-database-and-migrations.md` |

## 1. Purpose

Decisions every module inherits. Settled here once so modules do not each
invent their own event bus, deletion style, or timezone handling.

## 2. Domain Events

### 2.1 Mechanism

```txt
use case: DomainEvents.publish(event)        anywhere inside the unit of work
  -> buffered on the current transaction     (hangs off TenantContext / Database.run)
  -> commit succeeds: flush                  rollback: discard silently
      -> in-process handlers                 @nestjs/event-emitter behind the facade
      -> durable handlers enqueue BullMQ     via the tenant-stamped enqueue helper
```

- In-process delivery uses `@nestjs/event-emitter` (`@OnEvent` handlers), hidden
  behind the `DomainEvents` facade. Modules never import `EventEmitter2`
  directly — the facade owns after-commit semantics.
- Routing rule: cheap, local, recomputable reactions (reporting refresh flags,
  cache invalidation) run in-process; anything that must survive a crash or
  needs retry (notification, invoice provider sync, projection rebuild) is a
  BullMQ job enqueued by its handler.
- **Not chosen**, and why: `@nestjs/cqrs` (command-bus ceremony is a declared
  non-goal; its event bus is in-process anyway), raw Redis pub/sub
  (fire-and-forget, loses messages, no retry), Kafka/RabbitMQ/Redis Streams
  (operational weight without a requirement). BullMQ already is "events in
  Redis" with retries.
- **Upgrade path**: if a flow later needs guaranteed delivery, the facade's
  backend becomes a transactional outbox table — the `publish()` API and all
  module code stay unchanged. Do not build the outbox before a flow demands it.

### 2.2 Rules

1. Correctness never depends on events (existing rule, restated): the
   transaction contains everything that must be true.
2. Names are past-tense facts: `finance.payment-recorded`,
   `academic.enrollment-transferred`.
3. Payloads carry ids and minimal facts; consumers re-read current state.
4. Handlers are idempotent (BullMQ retries; sweeps re-trigger).
5. Every must-not-miss flow has a periodic reconciliation sweep (e.g. nightly
   "find issued invoices not yet synced") so a lost event self-heals. The crash
   window between commit and enqueue is covered by sweeps, not by ceremony.

## 3. Audit Log

`system_audit_logs` — append-only, tenant-scoped + RLS, indexed
`(tenant_id, entity_type, entity_id, created_at)`:

```txt
id, tenant_id, actor_user_id?, actor_type (USER | PLATFORM | JOB),
action ("academic.enrollment.transfer"), entity_type, entity_id, branch_id?,
changes jsonb, trace_id, created_at
```

Rules:

1. **Explicit call in the use case, inside the same transaction** — an audited
   action cannot commit without its audit row. No auto-logging interceptor: the
   value is the business meaning ("transferred learner"), which only the use
   case knows.
2. What gets audited: business mutations (all state-changing use cases),
   platform/cross-tenant actions (mandatory), job-driven mutations
   (`actor_type: JOB`). Logins live in `system_login_logs`, not here. Reads are
   not audited in v1.
3. `changes`: changed-fields diff for ordinary updates; full snapshot for
   finance-critical records (they are small).
4. Actor and tenant come from `TenantContext`; `trace_id` links the audit row
   to request logs.
5. This is where "Transfer/Hold/Re-entry are business events, not silent
   edits" becomes enforceable: those use cases must write their audit row.

## 4. Record Lifecycle (deletion and correction)

Two orthogonal axes — never conflate them:

| Axis            | Column                    | Meaning                                  |
| --------------- | ------------------------- | ----------------------------------------- |
| Existence       | `deleted_at timestamptz`  | null = live; set = hidden, restorable     |
| Business state  | per-table `status` enum   | DISABLED user, CLOSED class — still visible |

### 4.1 Fact / money tables (payments, allocations, invoices, attendance, settlements, audit, login log)

Append-only. No `deleted_at`, no updates to settled records. Corrections are
compensating records (`06-finance.md`). Deleting a payment is forbidden, not
"soft".

### 4.2 Master / operational data (person, program, class, room, role, ...)

Uniform soft delete via a shared `softDeleteColumn` helper
(`apps/api/src/database/schema/columns.ts`):

1. Delete = set `deleted_at` (+ audit row, same tx). Restore = set null
   (+ audit row). Both permission-guarded.
2. Repositories exclude soft-deleted rows **by default** via a query helper
   (same discipline as the tenant filter); admin/restore screens opt in
   explicitly.
3. Per-tenant uniques become partial indexes:
   `unique(tenant_id, code) where deleted_at is null` — codes are reusable
   after deletion. This is the default unique pattern for master data.
4. Soft delete is blocked while active references exist (an archived class with
   live enrollments is a bug, not a feature).
5. Users are **disabled, never soft-deleted** (login log and audit integrity);
   `system_users` has `status`, not `deleted_at`.

### 4.3 Hard delete

Exceptional: records created by mistake and never referenced, or platform
support operations. Always through an explicit audited path, never a routine
API.

## 5. Time and Timezone

1. **Instants** (created_at, payment received_at, a concrete session's
   start/end): `timestamptz`, UTC on the wire, ISO 8601 in APIs.
2. **Recurring wall-clock schedules** ("Mon-Wed-Fri 18:00") are **not
   instants**: store day-of-week + `time` columns. The tenant has a single
   `timezone` setting (default `Asia/Ho_Chi_Minh`); session generation
   materializes wall-clock into `timestamptz` instants using it. Storing
   "18:00 Monday" as a UTC instant is the classic scheduling bug — banned.
3. **Pure dates** (due date, birthday): `date` columns, no timezone.
4. Display is the frontend's job, in the tenant timezone with `vi-VN`
   formatting.
5. Name-ordered listings use the ICU collation `vi-x-icu` on relevant columns
   so Vietnamese diacritics sort correctly.

## 6. Language

1. The error/success `code` is the contract. API `message` stays short English
   (developer-facing fallback) — consistent with `03-backend-conventions.md`.
2. The frontend owns a `vi-VN` dictionary keyed by `code` (with parameter
   interpolation). Unknown code -> generic Vietnamese message + visible
   `traceId` for support.
3. Form UX validation is client-side zod with Vietnamese messages; the API's
   `VALIDATION_ERROR` field list is the rarely-seen fallback.
4. No server-side i18n framework (no `Accept-Language` negotiation) until a
   second locale is real.
5. Rule for every screen: never render the API `message` to end users except
   as the fallback path — always map the `code`.
