# Finance Technical Rules

| Field      | Value                                                            |
| ---------- | ----------------------------------------------------------------- |
| Status     | Active                                                            |
| Date       | 2026-07-06                                                        |
| Scope      | Money representation, finance records, flows, provider integration |
| Depends on | `02-module-boundaries.md`, `05-database-and-migrations.md`, `docs/business/academic-business-rules.md` |

## 1. Why This Doc Exists

Finance is a core domain, not a helper module. Most correctness risk in this
product concentrates here: allocation, rounding, settlement, and invoice state.
These rules are the TypeScript answer to "shouldn't money code be on the JVM?" —
discipline lives in one `Money` type and a small set of invariants.

## 2. Money Representation

**Money is integer VND, everywhere.**

- Currency: `VND` only in phase 1. VND has no minor unit — one đồng is the atom.
- Storage: `bigint` columns. API: integer JSON numbers (safe far beyond realistic
  tuition amounts; revisit only if values approach `2^53`).
- `Money` lives in `@edtech/shared` and is the only way finance code does
  arithmetic:

```ts
export type Money = { amount: number; currency: "VND" }; // amount: integer đồng

// construct/validate: vnd(n) throws on non-integers
// add / subtract / compare: exact integer ops
// multiply by ratio: integer math with explicit rounding (below)
```

Hard rules:

1. **No floating-point arithmetic on money.** No `* 0.7`, no `percent / 100`.
2. Ratios (revenue share, discounts, tax) are stored as **integer basis points**
   (`7000` = 70.00%), applied as
   `Math.trunc((amount * bps) / 10000)` with the remainder handled explicitly.
3. Every division defines where the remainder goes — rounding is a business
   decision, not a floating-point accident.

## 3. Allocation and Rounding Policy

Splitting an amount (payment across receivables, revenue share, installments)
uses the **largest remainder method**:

1. Compute each part with truncating integer division.
2. Distribute the leftover đồng, one each, to the parts with the largest
   remainders (ties: deterministic order, e.g. by item id).
3. The parts must sum exactly to the original amount — assert it.

Invariants (enforced in domain code and asserted in tests):

- `sum(allocations of a payment) <= payment.amount`; the difference is explicit
  unallocated balance, never silent.
- `sum(payments allocated to a receivable) <= receivable.amount` unless an
  explicit overpayment record exists.
- No negative amounts anywhere; reversals are new compensating records
  (append-only), never edits of settled records.

## 4. Finance Records Stay Separate

Do not collapse these into a generic transaction table:

```txt
pricing rule
financial terms
receivable
payment request
payment transaction
payment allocation
invoice
teacher commercial terms
teacher settlement
expense
payable
```

Learner-side (receivable) and center-side (payable) obligations never merge into
one bucket. Branch-specific vs tenant-shared costs stay distinguishable on
expense records.

## 5. Charge Basis: The Extension Contract

Every receivable (and by extension invoice line) references its business origin
through a module-agnostic **charge basis** instead of a hard foreign key into a
product module's table:

```txt
charge_basis = (source_module, source_type, source_id)

academic today:   ("academic", "enrollment", <enrollment-id>)
study abroad:     ("study_abroad", "case", <case-id>)        -- later
lms:              ("lms", "course_purchase", <purchase-id>)  -- later
```

Rules:

1. `finance` tables never hold structural FKs into product-module tables
   (`system` ids are fine). The charge basis is the pointer; referential checks
   happen in application code at creation time.
2. `FinancialTerms` is a **single, origin-agnostic Finance object** — not a
   per-module structure. It references the charge basis, so one terms structure
   serves academic enrollments today and study-abroad cases or LMS purchases
   later. Product modules supply pricing inputs and the origin record; they do
   not define their own terms tables. Origin-specific extras (if ever needed)
   live in a satellite extension keyed by terms id, never in the core money
   columns. See `11-billing.md`.
3. Adding a product module adds a new charge-basis source. It must not alter
   receivable, payment, allocation, or invoice structures — if it seems to, the
   contract is being violated.
4. Payment transactions attach to the **paying party** (a person — often a
   guardian), never to an enrollment. Allocation connects one payment to
   receivables of one or many learners, which is how one guardian transfer pays
   for several children.

## 6. Canonical Flows

Learner money:

```txt
Enrollment -> FinancialTerms -> Receivable -> PaymentRequest
  -> PaymentTransaction -> PaymentAllocation -> Invoice (when applicable)
```

Teacher money:

```txt
TeacherAssignment + TeacherCommercialTerms + session/payment facts
  -> TeacherSettlement -> Payable -> PaymentTransaction
```

Operating costs:

```txt
Expense -> Payable -> PaymentTransaction
```

Flow rules (from the business rule catalog — enforced in application code):

1. Enrollment does not imply payment; payment does not imply invoice; invoice
   does not imply payment.
2. One payment may cover many receivables; one receivable may be paid by many
   payments. `PaymentAllocation` is the join that carries the amounts.
3. Skip-level progression must not charge skipped participation by default.
4. Promotions modify financial terms before/at billing; they are never payment
   events.
5. Settlement is computed from commercial terms + operational facts, and always
   materializes as explicit `Payable` records.

## 7. Finance Module Shape

Finance is a heavy module. The money logic that must live in `domain/` as pure,
transaction-free code:

- `Money` operations and allocation (largest remainder)
- `ReceivableGenerationPolicy` (terms -> receivable schedule)
- `PaymentAllocationPolicy`
- `TeacherSettlementCalculator` (per commercial model: fixed, per-session,
  revenue share, hybrid)
- `InvoiceIssuancePolicy` (state machine: draft -> issued -> adjusted/replaced/cancelled)

`application/` owns transactions and orchestration; `infrastructure/` owns tables,
repositories, and provider adapters.

## 8. Invoice Numbering (gapless, per issuer/series)

Vietnamese invoices need sequential numbers per issuing legal entity and
series (ký hiệu), with explainable gaps only.

1. Drafts have **no number**. A number is allocated only at issuance.
2. Allocation uses a counter row per `(issuer_profile, series, year)`:
   `update invoice_counters set last = last + 1 ... returning last`, executed
   **inside the issuance transaction**. The row lock serializes concurrent
   issuance per series (a center issues tens per day — throughput is a
   non-issue), and a rollback returns the number automatically: gapless by
   construction.
3. **No Postgres `SEQUENCE`** for this: sequences are non-transactional — a
   rolled-back issuance would burn a number and create an unexplainable gap.
4. Cancelled invoices keep their number (legal requirement); numbers are never
   reused. Legitimate gaps are the documented cancellation/replacement
   lifecycle, not allocator behavior.
5. When an e-invoice provider is integrated, the authority-assigned
   number/code is stored alongside; the internal number stays.

## 9. Provider Integration (payment, e-invoice)

Phase 1 methods: cash recording, bank transfer recording, VietQR instruction.
Invoice records are first-class now; provider automation (e-invoice, gateways)
comes later. The rules below apply from the first integration:

1. Create internal records **before** calling any provider.
2. Never call a provider inside a database transaction.
3. Store provider reference IDs on our records.
4. Callbacks/webhooks are idempotent — replays must not double-post money.
5. Provider payloads stay in `infrastructure/` adapters, out of domain objects.
6. Vietnamese e-invoice compliance readiness: invoice data is modeled tax-ready
   (line items, adjustment/replacement/cancellation lifecycle) even before a
   provider is wired.
7. Every invoice carries an **issuer profile** (legal entity + tax code +
   serial/config). One tenant may operate several legal entities across
   branches — model this before the invoice phase, not during provider wiring.

## 10. Testing Requirements

Finance domain code gets the densest tests in the codebase, as pure unit tests:

- allocation: sum-exactness, largest-remainder distribution, deterministic ties
- settlement calculators per commercial model, including edge cycles
  (mid-cycle term changes, zero sessions, refunds)
- lifecycle state machines: illegal transitions must throw
- invoice numbering: concurrent issuance produces strictly sequential numbers;
  rolled-back issuance leaves no gap
- property-style checks where cheap: for random splits, parts always sum to total
