# Settlement and Payables (money out)

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Status     | Active                                                                |
| Date       | 2026-07-06                                                            |
| Scope      | Money-out: teacher settlement, operating expenses, payables, payout   |
| Depends on | `06-finance.md`, `11-billing.md`, `10-cross-cutting-conventions.md`, `docs/business/academic-business-rules.md` |

## 1. Purpose

The money-out half of finance: what the center owes teachers, vendors, and for
operating costs, and how it is computed, controlled, and paid. Together with
`11-billing.md` (money in) it produces per-branch profitability — the management
control view (Rule R2).

## 2. Money-out Is the Mirror of Money-in

Structurally the outflow mirrors the inflow, so it **reuses** billing primitives
(allocation, largest-remainder, append-only + compensating, aging, the run
pattern):

```txt
Money in:   FinancialTerms → Receivable → Payment(in)  → application → AR aging
Money out:  CommercialTerms/Expense → Payable → Payment(out) → application → AP aging
```

`Payable` is the mirror of `Receivable`; `Payment(out)` mirrors `Payment(in)`.
The real work is in the few asymmetries: revenue-share coupling to AR, PIT
withholding, and spending approval (sections 5, 7, 8).

## 3. Three Outflow Streams

| Stream | Source | Note |
| --- | --- | --- |
| **Teacher settlement** | `CommercialTerms` + teaching facts | the differentiator; sections 4–6 |
| **Operating expenses** | recorded ad-hoc / recurring | branch-vs-shared attribution; section 7 |
| **Payables + payout** | both of the above | mirror of receivable + payment; section 9 |

## 4. Teacher Commercial Terms and Compensation Models

`TeacherCommercialTerms` (Finance) is separate from `TeacherAssignment`
(academic) — Rule D6/T1. It carries a `compensation_model` discriminator plus a
**model-specific config**. Money output is rigidly typed (integer VND); the
config that describes *how to compute* is structured/flexible, so new models
never require migrating the money columns.

Phase-1 models (implement only these):

| Model | Config | Computed from |
| --- | --- | --- |
| `FIXED_SALARY` | monthly amount | calendar / working days |
| `PER_SESSION` | rate per session | sessions actually taught |
| `REVENUE_SHARE` | flat `bps` (e.g. 7000 = 70%) | class revenue (section 5) |

Structure accommodates but phase-1 **defers** (add later as a new calculator
strategy + enum + config, no schema migration): `PER_HOUR`,
`REVENUE_SHARE` tiered by headcount, hybrids.

**Do not build a generic "custom formula" engine.** The VN market advertises
"công thức của riêng bạn"; it is the same trap as a workflow engine — a DSL to
maintain and debug. Build concrete calculators; add concrete calculators when a
real case appears.

## 5. Revenue-Share Basis: the one hard coupling

Revenue-share settlement couples money-out back to money-in. The basis is a
policy on `CommercialTerms`:

| Basis | Teacher gets % of… | Bad-debt risk borne by |
| --- | --- | --- |
| `COLLECTED` (default) | revenue **actually collected** | teacher (unpaid → not yet shared) |
| `BILLED` | revenue **billed**, regardless of collection | center |

- **Default `COLLECTED`** — matches real VN teacher-led practice (the center does
  not pay out money it has not received) and protects cash flow.
- `COLLECTED` basis requires the ledger linkage from `11-billing.md` section 12:
  a collected payment records revenue **and** the resulting teacher liability as
  connected entries, so the settlement is traceable, not recomputed loosely.
- Basis is configurable per terms (some negotiated deals use `BILLED`).

## 6. The Settlement Run

`SettlementRun` is the mirror of `BillingRun` and, per market signal
(attendance-driven payroll), a baseline expectation. At period close, for each
teacher it computes payout from:

- **sessions actually taught** (scheduling session-occurrence facts),
- **commercial terms** (model + config),
- **class revenue** on the chosen basis (for revenue-share).

Same required properties as `BillingRun`:

1. **Preview before commit** — the control point; an operator reviews the payout
   table before it is committed.
2. **Idempotent** — re-running a committed period is a no-op or an explicit
   correction.
3. **Corrections are compensating records** — never edits of an issued payable.
4. **Worker-orchestrated, per-teacher transaction** — a BullMQ job, one
   tenant-bound `Database.run` per teacher; a `settlement_run` record tracks
   scope, actor, timing, totals (audited).

Output is always explicit `Payable` records (Rule T4) — settlement is never
implicit.

## 7. Settlement Adjustments and Tax

Settlement carries **adjustment lines** (same line-item pattern as billing):

- **Advance** (`tạm ứng`): money paid to the teacher earlier, deducted from the
  settlement.
- **Bonus / penalty**: explicit lines, authorized.
- **PIT withholding** (`thuế TNCN`): personal income tax withheld on teacher/
  contractor payments. Model it as a **deduction line + captured data for tax
  reporting**. Capture the data (base, rate, withheld amount) now; do **not**
  build a tax engine. This is the money-out compliance parallel to e-invoice on
  money-in, and a visible market gap.

Net payable = gross settlement − advances − PIT − other deductions + bonuses,
all integer VND with explicit rounding.

## 8. Operating Expenses

Expenses are mostly ad-hoc; keep them simple. The one load-bearing part is
**attribution** (Rule F5), because it feeds the P&L:

1. Record `Expense`: category, amount, date, **branch-specific vs
   tenant-shared-overhead**.
2. **Spending approval**: expenses (and payouts) are approved by an authorized
   role before payment — confirmed as a market baseline. Wire to permissions +
   the `tasks` module (an "approve expense" task).
3. Recurring expenses (rent, internet) use a light template that emits a payable
   each period — not a full "terms" structure.
4. An approved expense that owes money creates a `Payable`.

## 9. Payables, AP Aging, and Payout

- `Payable` is the mirror of `Receivable`: what the center owes, to whom, when
  due, from what source (settlement, expense, vendor bill). Receivable ≠ Payable
  stays (Rule F6).
- **AP aging**: outstanding payables by due age — what the center owes and when,
  the mirror of AR aging.
- **Payout**: `Payment(out)` records actual disbursement (cash / bank transfer),
  applied to payables — reusing the allocation primitive. Batch payout runs are
  a later convenience, not phase-1.

## 10. The Payoff: Per-Branch P&L

With both halves, each branch yields the management control view:

```txt
collected revenue  −  teacher settlement  −  operating expenses  =  branch P&L
```

This is a decision-support projection, not a general ledger (Rule R2) — built in
`reporting` as a downstream read model over finance truth, never a second source
of truth. This per-branch operational+financial control is the visible market
gap (`docs/business/competitor-landscape-vn.md`).

## 11. Ledger Discipline

Same as `11-billing.md` section 12: balances are derived from immutable entries
(payable outstanding = charges − payouts); settlement is explicitly linked to
the revenue that produced it. **Not** full double-entry, **not** a ledger engine
service in phase 1.

## 12. Testing Requirements

- SettlementRun: idempotency; per-session amount from sessions taught;
  revenue-share on `COLLECTED` basis matches actual collections; compensating
  correction after a wrong session count.
- Adjustments: advance deduction, PIT withholding math, net payable exactness.
- Expenses: branch-vs-shared attribution flows to the right P&L bucket;
  approval required before payable.
- AP aging: bucketing; payout application sum-exactness.

## 13. Phase-1 Scope

Build:

- `TeacherCommercialTerms` (models: `FIXED_SALARY`, `PER_SESSION`,
  `REVENUE_SHARE` flat) + `TeacherSettlementCalculator` strategies
- `SettlementRun` (preview, idempotent, compensating, worker) from attendance +
  terms + revenue on `COLLECTED` basis (configurable)
- settlement adjustments: advance, bonus/penalty, PIT withholding (data capture)
- `Expense` (category, branch-vs-shared) + spending approval + recurring template
- `Payable` + AP aging + `Payment(out)` application
- per-branch P&L read model seam in `reporting`

Defer:

- `PER_HOUR`, headcount-tiered / hybrid compensation (new calculators later)
- batch payout runs, tax reporting engine, vendor management beyond basic bills
