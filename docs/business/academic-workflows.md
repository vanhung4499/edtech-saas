# Academic Core Workflows v1

| Field      | Value                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Status     | Draft for review                                                                                                                         |
| Date       | 2026-07-04                                                                                                                               |
| Scope      | Academic / teaching-center workflows                                                                                                     |
| Depends on | `docs/business/academic-business-architecture.md`, `docs/business/academic-context-map.md`, `docs/business/academic-business-objects.md` |

## 1. Purpose

This document defines the canonical business workflows for the Academic platform.

Its goal is to turn the business architecture and business object catalog into
clear end-to-end operating flows that can later be mapped into:

- application services
- module boundaries
- screen flows
- API contracts
- state transitions

These workflows are written in business language, not technical implementation detail.

## 2. Workflow Design Rules

The workflows in this document follow these rules:

1. Each workflow has one clear business outcome.
2. Each workflow names the owning or coordinating context.
3. Cross-context handoffs are explicit.
4. Money flow is kept separate from academic participation truth.
5. Payment and invoice are treated as separate steps from billing.

## 3. Workflow List

The Academic platform should support at least these canonical workflows:

1. `Lead to Enrollment`
2. `Teacher-Sourced Intake to Enrollment`
3. `Class Creation and Scheduling`
4. `Enrollment to Billing`
5. `Payment Collection and Reconciliation`
6. `Invoice Issuance`
7. `Learner Transfer / Hold / Re-entry`
8. `Teacher Settlement`
9. `Operating Expense Recording and Payable Control`

## 4. Lead to Enrollment

### Purpose

Convert a center-driven candidate into active academic participation.

### Primary contexts

- `Admissions`
- `Academic Delivery`
- `Finance`

### Business trigger

A learner or guardian expresses interest in joining a program through a normal
center-owned acquisition path.

### Flow

1. Create `Lead`
2. Qualify into `Prospect` if appropriate
3. Record `Consultation`
4. Perform `Placement Assessment` if needed
5. Recommend target `Program` and `Class`
6. Apply relevant `Promotion Offer` or commercial guidance if applicable
7. Convert prospect into `Enrollment`
8. Create `Enrollment Financial Terms`
9. Generate initial `Receivable Items`

### Business outcome

The learner is academically enrolled and has an initial financial commitment.

### Important rules

- Admissions owns pre-enrollment advisory flow.
- Academic Delivery owns the actual enrollment truth.
- Finance owns the learner-specific financial commitment.

## 5. Teacher-Sourced Intake to Enrollment

### Purpose

Convert a learner coming through a teacher-led acquisition model into formal
platform participation.

### Primary contexts

- `Admissions`
- `Academic Delivery`
- `Finance`

### Business trigger

A teacher brings a learner or learner group into the center.

### Flow

1. Create or identify `Person`
2. Record `Source Channel` as teacher-sourced or equivalent
3. Capture minimum intake and guardian context if relevant
4. Assign target `Program` and `Class`
5. Create `Enrollment`
6. Apply `Enrollment Financial Terms`
7. Link the operational teaching context to the appropriate `Teacher Assignment`
8. Create learner-facing `Receivable Items`
9. Keep teacher payout logic separate for later `Teacher Settlement`

### Business outcome

The learner becomes part of formal center operations without forcing a full
traditional admissions funnel.

### Important rules

- Teacher-sourced intake is a valid first-class flow.
- Learner enrollment and teacher payout are related, but not the same record.
- Finance for the learner and finance for the teacher must remain separate.

## 6. Class Creation and Scheduling

### Purpose

Create an academically valid class and make it operationally executable.

### Primary contexts

- `Academic Delivery`
- `Scheduling & Resources`

### Business trigger

The center wants to open a new class or academic grouping.

### Flow

1. Define target `Program`
2. Create `Class`
3. Assign academic semantics such as level or grouping meaning
4. Assign tentative `Teacher Assignment`
5. Propose `Recurring Schedule`
6. Allocate `Room`
7. Run `Conflict Detection`
8. Confirm executable schedule
9. Publish class availability for admissions or internal allocation

### Business outcome

A class exists both as an academic object and as a schedulable operational unit.

### Important rules

- Academic Delivery owns class identity.
- Scheduling & Resources owns room/time feasibility.
- A class is not considered operationally ready until scheduling feasibility is confirmed.

## 7. Enrollment to Billing

### Purpose

Turn academic participation into a concrete learner financial obligation.

### Primary contexts

- `Academic Delivery`
- `Finance`

### Business trigger

A learner is newly enrolled or academically changed in a way that affects charges.

### Flow

1. Confirm `Enrollment`
2. Determine `Enrollment Financial Terms`
3. Apply pricing logic
4. Apply promotions or special terms if valid
5. Generate `Receivable Items`
6. Set due schedule and debt expectations
7. Prepare future payment requestability

### Business outcome

The learner now has billable financial items linked to academic participation.

### Important rules

- `Enrollment` is not billing.
- Different learners in the same class may produce different financial terms.
- Skip-level or transfer may change billing truth.

## 8. Payment Collection and Reconciliation

### Purpose

Collect money from learners or guardians and correctly match it to outstanding charges.

### Primary contexts

- `Finance`

### Business trigger

A learner-facing receivable is due or being paid.

### Flow

1. Create `Payment Request` if needed
2. Select payment method: cash, bank transfer, or VietQR
3. Receive or record `Payment Transaction`
4. Match payment to one or more `Receivable Items`
5. Resolve partial, overpaid, or underpaid cases
6. Update debt state
7. Mark remaining unmatched balances for follow-up if necessary

### Business outcome

The system knows exactly what has been paid, what remains due, and how the money
was allocated.

### Important rules

- Payment request is not payment transaction.
- One payment may cover multiple charges.
- One charge may be covered by multiple payments.

## 9. Invoice Issuance

### Purpose

Issue a formal billing document for applicable collected or billable amounts.

### Primary contexts

- `Finance`

### Business trigger

A charge or payment event reaches the business point where invoice issuance is required.

### Flow

1. Identify invoiceable charge basis
2. Prepare invoice line composition
3. Create `Invoice Draft`
4. Validate required billing and tax-ready data
5. Issue `Invoice`
6. Track invoice lifecycle state
7. Support later adjustment, replacement, or cancellation if needed

### Business outcome

The center has a formal invoice record aligned with its financial and legal process.

### Important rules

- Invoice is not the same as receivable item.
- Invoice is not the same as payment transaction.
- Finance owns invoice lifecycle and compliance readiness.

## 10. Learner Transfer / Hold / Re-entry

### Purpose

Handle academic participation changes without breaking operational or financial truth.

### Primary contexts

- `Academic Delivery`
- `Finance`
- `Scheduling & Resources` when schedule impact exists

### Business trigger

A learner changes class, pauses study, resumes study, or re-enters after interruption.

### Flow

1. Record `Transfer`, `Hold`, or `Re-entry`
2. Update active `Enrollment` truth
3. Update class roster implications
4. Update schedule/resource impact if applicable
5. Recalculate or adjust `Enrollment Financial Terms` if needed
6. Create or update billing adjustments, carry-forward, or refunds if required

### Business outcome

The learner's operational study state and financial state remain aligned after change.

### Important rules

- Academic change is owned by Academic Delivery.
- Financial effect is owned by Finance.
- Transfer is not a silent edit; it is a business event.

## 11. Teacher Settlement

### Purpose

Turn teaching participation and commercial terms into what the center owes the teacher.

### Primary contexts

- `Academic Delivery`
- `Finance`
- `Scheduling & Resources` when actual sessions affect payout

### Business trigger

A settlement cycle closes or the center needs to compute teacher payable amounts.

### Flow

1. Read valid `Teacher Assignment`
2. Read active `Teacher Commercial Terms`
3. Read relevant class or session facts if needed
4. Compute `Teacher Settlement`
5. Generate `Payable Item`
6. Record payment when payout happens

### Business outcome

The system knows what is owed to each teacher and why.

### Important rules

- Assignment is not compensation logic.
- Commercial terms are not payment records.
- Teacher-led and center-led classes may use different settlement models.

## 12. Operating Expense Recording and Payable Control

### Purpose

Track the financial cost side of operating the center.

### Primary contexts

- `Finance`

### Business trigger

The center incurs or recognizes an operating expense.

### Flow

1. Record `Expense Item`
2. Attribute branch or shared-overhead responsibility
3. Create related `Payable Item` when money is owed
4. Track due status
5. Record payment when settled
6. Feed management reporting

### Business outcome

The center has visibility into real operating costs, not only income.

### Important rules

- Expense classification and payable timing are related but not identical.
- Branch-specific and tenant-wide costs must stay distinguishable.

## 13. Cross-Workflow Notes

### 13.1 Admissions is not optional for all cases, but it is not equally deep

- center-led intake often uses richer admissions flow
- teacher-led intake may use a lighter admissions path

### 13.2 Delivery and Finance must stay synchronized, not merged

Academic actions frequently affect money, but they do not own money truth.

### 13.3 Scheduling influences both operations and finance

Scheduling is mostly operational, but session facts may later influence billing
and settlement decisions.

### 13.4 Invoice is downstream from billing, not a replacement for billing

Billing decides what is owed.
Invoice documents part of that billing in a formal way.

## 14. Architectural Conclusion

The Academic platform should be designed around a small set of stable, canonical
workflows rather than many disconnected screens.

The most important workflow boundaries are:

1. `Lead/Prospect` becomes `Enrollment` only through a defined conversion.
2. `Enrollment` becomes money only through `Enrollment Financial Terms` and billing.
3. `Billing` becomes collected money only through payment and reconciliation.
4. `Billing` becomes formal documentation through invoice issuance.
5. `Teacher Assignment` becomes payout through settlement, not directly.
6. `Expense` becomes cash outflow through payable control, not directly.

These workflows should become the basis for:

- application service design
- command/use-case naming
- screen flow design
- API contract grouping
- policy and rule documentation
