# Billing and Revenue Collection

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Status     | Active                                                                |
| Date       | 2026-07-06                                                            |
| Scope      | Revenue-in: pricing, financial terms, billing runs, collection        |
| Depends on | `06-finance.md`, `10-cross-cutting-conventions.md`, `docs/business/academic-business-rules.md` |

## 1. Purpose

This is the revenue-in core: how a learner's participation becomes money the
center must collect, and how that is controlled at 500+ learners without manual
per-student spreadsheets.

The dominant, hardest case drives the design: **teacher-led extra-study classes
billed in arrears, per attended session, collected by the center**. Getting this
right makes the simpler prepaid language-center cases trivial.

`06-finance.md` owns the money foundation (integer VND, charge basis, record
separation, invoice numbering). This document owns the billing subsystem on top
of it. Terminology follows industry billing/AR standards in code; the operator
UI shows Vietnamese equivalents (`10-cross-cutting-conventions.md` section 6).

## 2. The Spine

```txt
PricingRule ─┐
             ├─► FinancialTerms ──► BillingRun ──► Receivable ──► CashApplication ──► Invoice
Adjustments ─┘   (per learner,      (period close)   (open item)    (payment matched)
                  line-item)             │                              │
Attendance ───────────────────────────────┘                              ▼
                                                              AR aging ──► collection Task + notification
                                                                            │
                                              Teacher settlement ◄──────────┘ (downstream, linked)
```

## 3. FinancialTerms

A single **Finance-owned, origin-agnostic, line-item** object — the per-learner
financial commitment. Renamed from `EnrollmentFinancialTerms`: the origin
(enrollment today, study-abroad case later) lives in the charge basis, so the
name carries no module prefix.

Structure (not a single net number):

```txt
FinancialTerms
  charge_basis        (source_module, source_type, source_id)   ← the origin
  charge_model        ONE_TIME | RECURRING_FLAT | USAGE_BASED
  billing_timing      IN_ADVANCE | IN_ARREARS
  payment_schedule    LUMP_SUM | INSTALLMENTS
  base_line(s)        base amount(s) from the applicable PricingRule
  adjustment_line(s)  each: kind, source (coupon/campaign/manual/rule), amount
  net                 = sum(base) − sum(adjustments), integer VND
  billing_cycle       reference (for recurring/usage): monthly, etc.
```

Rules:

1. Terms is line-item, not a baked net — required for traceability, invoice
   display (VN invoices show chiết khấu), reversibility, and campaign-cost
   reporting.
2. Terms belongs to Finance; academic creates the enrollment then asks finance
   to create terms referencing it. `Enrollment` ≠ `FinancialTerms` stands.
3. Origin-specific extras (rare) go in a satellite table keyed by terms id,
   never in the core money columns (`06-finance.md` section 5).

## 4. The Three Orthogonal Axes (charging models)

"Kiểu thu phí" is **not a list of types** — it is three independent axes.
Implement the axes; the real-world combinations fall out. This avoids a
combinatorial explosion of "fee types" and is the future-proofing that matters.

| Axis                 | Values (code)                              | Vietnamese UI                        |
| -------------------- | ------------------------------------------ | ------------------------------------- |
| **Charge model**     | `ONE_TIME` / `RECURRING_FLAT` / `USAGE_BASED` | trọn gói / cố định theo kỳ / theo buổi |
| **Billing timing**   | `IN_ADVANCE` / `IN_ARREARS`                | thu trước / thu sau                   |
| **Payment schedule** | `LUMP_SUM` / `INSTALLMENTS`                | một lần / trả góp                     |

Real cases decompose cleanly:

| Case | charge_model | timing | schedule |
| --- | --- | --- | --- |
| Language full course, pay upfront | ONE_TIME | IN_ADVANCE | LUMP_SUM / INSTALLMENTS |
| Language monthly, pay start of month | RECURRING_FLAT | IN_ADVANCE | per cycle |
| **Extra-study teacher-led, pay end of month by sessions** | **USAGE_BASED** | **IN_ARREARS** | per cycle |
| Prepaid package (buy 24 sessions) | USAGE_BASED | IN_ADVANCE | LUMP_SUM → draw down |

`USAGE_BASED + IN_ADVANCE` is a prepaid package: the upfront payment becomes a
**credit balance** (section 8) that attendance draws down. It is not a fourth
model.

## 5. Charge Generation and the Billing Run

The **BillingRun** is the antidote to per-student spreadsheets and the system's
core control feature. A staff member closes a period for a scope (branch/class);
the system materializes receivables for every active enrollment from terms +
attendance.

Required properties:

1. **Preview before commit.** The run computes and shows the full amount table;
   an operator reviews and reconciles, then commits. This is the control point.
2. **Idempotent.** Re-running a committed period does not double-charge; it is a
   no-op or an explicit correction run.
3. **Corrections are compensating records.** Wrong attendance found after commit
   → adjustment/compensating receivable, never an edit of an issued receivable
   (append-only, `10-cross-cutting-conventions.md`).
4. **Worker-orchestrated, per-enrollment transaction.** A BillingRun is a BullMQ
   job that processes each enrollment in its own tenant-bound `Database.run`
   transaction — never one giant transaction for 500 learners. A `billing_run`
   record tracks scope, actor, timing, progress, and totals (audited).
5. **Mid-period handling.** Learners who joined, transferred, held, or left
   mid-cycle are billed from their actual attended/eligible sessions, honoring
   Rule F3 (no charge for non-participation).

Timing shapes generation: `IN_ADVANCE + RECURRING_FLAT` generates the next
cycle's flat charge at cycle open; `IN_ARREARS + USAGE_BASED` generates the
closed cycle's charge from attendance at cycle close.

## 6. Attendance as Billing Input

For arrears/usage billing, `Receivable = f(billable attendance, rate) − adjustments`.
Attendance (owned by academic, over scheduling's session occurrence facts) must
be finalized before a billing run and must carry a **billability dimension**:

```txt
attendance outcome: PRESENT | ABSENT | EXCUSED | MAKEUP | TRIAL_FREE
```

The charge model maps outcomes to money:

- `USAGE_BASED`: bill `PRESENT` (and `MAKEUP` once, not double); `TRIAL_FREE`
  never billable; `EXCUSED`/`ABSENT` billability is a **configurable tenant
  policy** (many centers do not charge excused absences).
- `RECURRING_FLAT`: bill the flat cycle amount regardless of attendance.

The excused-absence policy is an explicit configuration, never an implicit
default — it directly changes what learners owe.

## 7. Adjustments: Discounts, Coupons, Promotions, Campaigns

Adjustments are **line items with a source**, resolved into the terms:

| Type | Standard term | Trigger |
| --- | --- | --- |
| Manual discount | discount (authorized) | staff entry, audited |
| Relationship (sibling, staff child) | rule discount | rule eval |
| Scholarship | discount (conditional) | approval |
| Redeemable code | **coupon + promotion code** | code redemption |
| Auto time-boxed offer | **campaign** | eligibility eval |
| Referral | referral incentive | referral link |

Resolution rules:

1. `PricingResolutionPolicy` takes base + eligible adjustments + stacking rules
   → deterministic net. Order, stacking (stack vs exclusive), and caps
   (max discount, floor ≥ 0, never below a configured minimum) are explicit
   policy, not incidental.
2. Percentage adjustments use integer-VND largest-remainder rounding
   (`06-finance.md`) — rounding is a business decision.
3. A promotion/campaign is an **input** that produces an adjustment line; it
   never touches an already-generated receivable or a payment (Rule F4).
4. **Code redemption is a concurrent counter**, same pattern as invoice
   numbering: `update ... set used = used + 1 where used < limit ... returning`
   inside the redemption transaction, with a redemption record linking
   code → terms. Limited codes cannot over-redeem under concurrency.
5. Campaign eligibility is evaluated at terms creation from simple criteria
   (window + program + branch to start); budget caps, if used, are another
   counter.

## 8. Credit Balance (student wallet)

A **credit balance** is money the center owes the learner/payer — a liability,
not a receivable and not a payment. Sources: overpayment, prepaid package
(`USAGE_BASED + IN_ADVANCE`), carry-forward on transfer/drop, refundable context.

Rules:

1. Modeled as **immutable entries; balance is derived** (credits − draws), not a
   mutable counter — the ledger discipline from section 12.
2. Cash application may draw from credit balance before requesting new money;
   drawing down is an entry, not a payment.
3. A credit balance belongs to a party (often the guardian), consistent with
   payer-level payments.

## 9. Cash Application and AR Aging

- A `PaymentTransaction` belongs to the **paying party** (often a guardian).
  **CashApplication** (allocation) matches it across one or many learners'
  receivables — partial, over-, and under-payment handled explicitly; unmatched
  amount becomes credit balance or stays unapplied, never silently lost
  (`06-finance.md` allocation invariants).
- **AR aging** buckets outstanding receivables by overdue age per learner/branch.
  Aging is a first-class output for arrears billing (debt accumulates after
  delivery), and it feeds: collection **tasks** (assigned to accountant) and
  **notification** (payment reminders via Zalo/SMS) — both already-reserved
  capabilities, triggered by billing/aging events.
- Incoming bank transfers are matched to receivables (mostly automatically) by
  the reconciliation subsystem before cash application runs — see
  `13-reconciliation.md`.

## 10. Change Over Time

1. Generated receivables are effectively immutable (they may be paid/invoiced).
   Changes act on **future, unpaid, uninvoiced** receivables only.
2. `FinancialTerms` is versioned: a change creates a new version + event,
   preserving history. Terms describe intent; receivables are the concrete
   obligations where immutability lives.
3. Transfer to a different-priced class, hold, and skip-level adjust future
   receivables; the delta becomes credit balance, carry-forward, or refund —
   explicit records, never silent edits (Rule D4).
4. A price change for new learners never rewrites existing terms (grandfathering).

## 11. Center Collects; Teacher Settlement Is Downstream

The center is the collection point even for teacher-led classes:

1. Receivables belong to the center for every class, teacher-led included. The
   system — not a teacher's notebook — is the source of truth for who owes and
   who paid.
2. Teacher settlement is computed **downstream** from the class's collected/
   billed revenue and is **linked**, not recomputed loosely: the path
   `payment → revenue → teacher liability` is traceable (section 12). It stays a
   separate record set (`TeacherCommercialTerms`/`TeacherSettlement`/`Payable`)
   per existing rules.
3. Teachers get a **read-only** view of their classes (learners, collected,
   their share) — never write access to money records.

## 12. Ledger Discipline (without a full ledger)

This product has two-sided money (student revenue in, teacher/vendor payouts
out), so adopt ledger *discipline* without a general ledger:

1. **Balances are derived from immutable entries**, not stored mutable counters:
   receivable outstanding = charges − applications; credit balance = credits −
   draws.
2. **Settlement is explicitly linked**, so revenue-share is provably correct:
   a collected payment records the revenue and the resulting teacher liability
   as connected entries.
3. **Not adopted in phase 1**: full double-entry across all money, and any ledger
   engine service (Tigerbeetle/Formance/Kill Bill) — separate services break the
   tenant/audit/on-prem contracts and the scale does not need them. Revisit only
   for real accounting needs.

## 13. Testing Requirements

- BillingRun: idempotency (re-run no double charge); arrears amount from
  attendance; mid-period join/transfer/hold proration; excused-absence policy
  on/off.
- CashApplication: sum-exactness, partial/over/under, multi-learner allocation
  from one guardian payment.
- Coupon redemption: concurrent redemption never exceeds the limit.
- Credit balance: overpayment → credit; prepaid package draw-down to zero;
  derived balance matches entry sum.
- AR aging: bucketing correctness; overdue triggers task/notification events.

## 14. Phase-1 Scope (Finance Core)

Build:

- `PricingRule` + `FinancialTerms` (line-item, origin-agnostic)
- charge models `RECURRING_FLAT` + `USAGE_BASED`; both timings; `LUMP_SUM`
- BillingRun with preview, idempotency, compensating corrections
- attendance billability + excused-absence policy
- manual + sibling-style discount; basic promotion code (limit + validity)
- CashApplication + credit balance (overpayment); AR aging
- center-collected receivables; settlement linkage seam

Defer:

- `INSTALLMENTS` schedule engine; `ONE_TIME` beyond a simple case
- campaign eligibility engine, referral graph, budget caps
- automated re-pricing on transfer (manual adjustment first)
- full teacher-settlement models (arrive with the settlement work)
