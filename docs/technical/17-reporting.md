# Reporting and Control

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Status     | Active                                                                |
| Date       | 2026-07-06                                                            |
| Scope      | Operational and financial read models, dashboards, exports. Light.    |
| Depends on | `11-billing.md`, `12-settlement-and-payables.md`, `14-academic.md`, `15-scheduling.md`, `04-tenancy-and-data-scope.md` |

## 1. Purpose

`reporting` gives operators and owners visibility for control. It is where the
product's promise — controlling **operations and finance together** — becomes
visible, so it matters as a value surface even though it is technically light.

It is **downstream and read-only** (Rule R1): it aggregates from the owning
modules and must never become a hidden source of truth or a write surface
(Rule R3 keeps operational and financial views linkable).

## 2. Module Shape

**Light** (`controller → service → repository`). The repository holds read-only
cross-module queries/views; no writes, no domain layer. Report endpoints feed the
frontend reporting screens (`07-frontend.md`).

## 3. Read-Model Strategy

Phase 1: **live aggregation queries / read-only SQL views** over source tables.
At this scale (hundreds of learners, small data) live queries are fresh, simple,
and need no sync.

- Cross-module reads use **read-only views** — the sanctioned boundary mechanism
  (`02-module-boundaries.md` §4). Reporting re-reads source truth; it accepts
  coupling to source schemas as a downstream reader and is updated when they
  change.
- **Deferred until volume demands it:** denormalized projections / materialized
  views refreshed by post-commit events (`10-cross-cutting-conventions.md` §2).
  The read API stays the same when this is added — reporting never becomes a
  write surface to speed itself up.

## 4. Tenant and Data Scope (critical)

Reporting is a classic scope-leak spot — it aggregates many rows at once.

1. **Tenant**: RLS applies as everywhere (`04-tenancy-and-data-scope.md`).
2. **Branch data scope**: every report query applies `applyBranchScope` from the
   ambient `TenantScope.branchIds`. A branch manager's numbers include only their
   branches; a tenant-wide role sees all.
3. This is a mandatory test: a `BRANCH_SET` user's every report is restricted to
   scope. Aggregates must never bypass the scope filter.

## 5. Phase-1 Report Set

Operational:

- active learners (by branch / program / class)
- class fill rate (roster vs capacity)
- attendance summary (by class / teacher)
- room and teacher utilization
- transfer / hold / drop trends

Financial:

- revenue by branch / program / class (collected)
- **AR aging** (outstanding by learner / age bucket)
- **collection rate** (billed vs collected) — key for the arrears model
- teacher settlement / payable status
- expenses by branch / category
- **branch P&L** (§6)

## 6. Branch P&L (the marquee)

The control view that unites money-in and money-out:

```txt
collected revenue  −  teacher settlement  −  operating expenses  =  branch P&L
```

- Links `11-billing.md` (collected) and `12-settlement-and-payables.md`
  (settlement, expenses).
- It is a **decision-support projection, not a general ledger** (Rule R2). It
  reconciles to finance truth but does not replace accounting.
- This per-branch operational+financial control is the visible market gap
  (`docs/business/competitor-landscape-vn.md`).

## 7. AR Aging and Collection Rate

Aging and collected-vs-billed are the numbers that make the arrears model
controllable (debt accumulates after delivery). They read finance receivables and
payments; reporting presents them per branch/learner/age. They also drive
collection **tasks** and **notification** upstream (that triggering is finance/
billing's, not reporting's — reporting only shows).

## 8. Exports

CSV/Excel export of any report — operators need offline copies for tax, owners,
and reconciliation. Exports respect the same tenant + branch scope as the on-screen
report.

## 9. Seams

- Reads only, via read-only views / owning modules' query APIs; writes nothing.
- **AI** features consume reporting read models (the reserved "AI is a consumer"
  seam, `docs/business/academic-business-architecture.md` §18.2).
- If a report needs data an owning module does not expose, add a query API there —
  do not reach into raw tables in a way that couples reporting to internals.

## 10. Phase Scope (Phase 6)

Build:

- the report set (§5) as live, tenant + branch-scoped queries/views
- branch P&L, AR aging, collection rate
- CSV/Excel export with the same scope

Defer:

- materialized projections / event-fed read models (until data volume needs it)
- custom/ad-hoc report builder, scheduled report emails, BI-tool export
- cross-tenant platform analytics (separate platform-admin concern)
