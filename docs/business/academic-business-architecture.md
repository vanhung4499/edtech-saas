# Academic Business Architecture v1

| Field    | Value                                        |
| -------- | -------------------------------------------- |
| Status   | Draft for review                             |
| Date     | 2026-07-06                                   |
| Scope    | Academic / teaching-center domain only       |
| Excludes | Study Abroad, Labor Export detailed modeling |

## 1. Purpose

This document defines the business architecture for the Academic part of the platform.
Its purpose is to create a stable business foundation for a Vietnam-focused education
operations SaaS before detailed data modeling or implementation decisions.

This is a business architecture document, not a database schema and not a UI spec.
It defines business domains, boundaries, core concepts, and the main operational and
financial flows that the system must support.

## 2. Product Thesis

The product is a SaaS platform for operating private education centers in Vietnam.

In the first major phase, the platform focuses on academic / teaching-center
operations rather than LMS-heavy teaching technology. The primary value is not
content delivery. The primary value is helping centers run their business,
classes, people, schedules, payments, and financial control in a way that matches
real operating models in Vietnam.

The system must support at least two first-class operating models from the start:

1. `center-led`
   The center owns recruitment, admissions, class creation, tuition collection,
   and teacher compensation.
2. `teacher-led`
   A teacher may bring students into the center, while the center provides rooms,
   schedules, operational control, collection support, and commercial settlement.

The platform remains SaaS-first. The first customer is a validation case, not a
special-case product branch.

## 3. Design Principles

### 3.1 Vietnam-first pragmatism

The architecture should support real operating models common in Vietnam before
optimizing for global generality.

### 3.2 Business separation before technical abstraction

The system should separate distinct business concerns clearly:

- admissions is not class operations
- class operations is not finance
- finance is not payment execution
- payment execution is not tax invoicing

### 3.3 Specific but extensible

The platform should not over-generalize early. It should model today's important
cases well while leaving room for future domains.

### 3.4 Operational truth over catalog purity

Education centers operate through real classes, real rooms, real schedules, real
teachers, and real payments. The architecture must preserve these operational
realities even when product structure looks simple on paper.

### 3.5 Finance is core

Finance is not a supporting utility. Tuition, debt tracking, teacher settlement,
operating expenses, payment collection, and invoice readiness are core business
capabilities.

### 3.6 New domains extend, they do not modify

Future domains (study abroad, labor export, LMS, AI-assisted features) plug into
four stable extension points: shared person identity, per-tenant module
entitlement, post-commit events, and the finance charge basis.

Adding a domain must not require changing core module structures. If a new
domain appears to need a core change, the extension contract is wrong and must
be fixed first.

## 4. Business Domain Map

The Academic business architecture is organized into six domains:

1. `Shared Core`
2. `CRM & Admissions`
3. `Academic Catalog & Delivery`
4. `Scheduling & Resource Management`
5. `Academic Finance`
6. `Reporting & Control`

`Study Abroad` and `Labor Export` are future domains. They are intentionally not
modeled in detail here, but this architecture keeps room for them later.

## 5. Shared Core

Shared Core contains concepts reused by all major domains.

### 5.1 Core capabilities

- `Tenant`
- `Branch`
- `User Account`
- `Role`
- `Permission`
- `Data Scope`
- `Person`
- `Contact Information`
- `Guardian Relationship`
- `Document`
- `Audit Trail`
- `Calendar / Term primitives`

### 5.2 Core rules

- `Person` is the shared human identity backbone of the platform.
- `Student`, `Teacher`, `Guardian`, and `Staff` are business roles or domain
  participations built on top of shared identity, not necessarily isolated
  identity silos.
- Multi-branch access control is first-class. Role and data scope are separate.
- Shared Core must stay small and stable. It must not absorb domain workflows.

## 6. CRM & Admissions

This domain manages how learners enter the center before active study operations begin.

### 6.1 Purpose

CRM & Admissions answers:

- who is interested
- where they came from
- who is handling them
- what they are being advised into
- whether they convert into active learning participation

### 6.2 Core capabilities

- `Lead`
- `Prospect`
- `Source Channel`
- `Consultation`
- `Assessment / Placement`
- `Admission Recommendation`
- `Promotion Offer`
- `Conversion to Enrollment`

### 6.3 Important business realities

- Foreign-language centers usually need a stronger admissions flow, including
  consultation and placement.
- Teacher-led academic classes may use a lighter admissions flow, but still need
  intake, source tracking, and conversion into formal enrollment.
- Promotions are not only marketing artifacts. They influence financial terms.

## 7. Academic Catalog & Delivery

This domain defines what the center offers and how learners join actual classes.

### 7.1 Program-first modeling

At this stage, the architecture uses:

- `Program`
- `Class`

and does not require a separate `Stage` entity.

This is intentional. It keeps the operating model simple for users while still
supporting common Vietnam cases such as:

- `HSK` as a program with classes like `HSK1-A`, `HSK2-B`, `HSK3-evening`
- extra-study classes like `6-1`, `6-2`, `6-3` under a teacher or program family

### 7.2 Why Program -> Class

`Program` is the business offering family.
`Class` is the operational teaching unit.

This is a better fit than forcing `Course` to mean multiple things at once.

### 7.3 Class semantics

Although there is no separate `Stage` entity in v1, a class may still carry
learning semantics such as:

- level code
- progression order
- entry requirement
- suitability notes

This allows the system to support:

- class transfer
- skip-level movement
- different tuition by class level
- non-school-style grouping common in Vietnamese centers

### 7.4 Core capabilities

- `Program`
- `Program Offering`
- `Class`
- `Enrollment`
- `Enrollment Status`
- `Transfer`
- `Hold / Pause`
- `Re-entry`

### 7.5 Business rule

`Enrollment` is an academic participation record. It should not directly carry
all finance logic inside itself.

## 8. Scheduling & Resource Management

This domain manages whether classes can run in reality.

### 8.1 Purpose

Scheduling & Resource Management answers:

- when the class runs
- where it runs
- whether the assigned teacher is available
- whether the room is available
- whether the operational plan is feasible

### 8.2 Core capabilities

- `Room / Classroom`
- `Room Capacity`
- `Time Slot`
- `Recurring Schedule`
- `Session Calendar`
- `Teacher Availability`
- `Room Allocation`
- `Conflict Detection`
- `Reschedule`
- `Make-up Session`
- `Substitute Teacher`

### 8.3 Business significance

This is not a minor sub-feature. It is one of the daily operating centers of the
business, especially for:

- multi-branch operations
- after-school classes
- teacher-led classes
- room-limited centers

## 9. Academic Finance

Academic Finance is a major domain, not a helper module.

It should be named `Finance` at the domain level, while `Billing` remains one of
its internal capabilities.

### 9.1 Finance subdomains

- `Pricing & Promotion`
- `Billing`
- `Payments & Reconciliation`
- `Teacher Settlement`
- `Expenses & Payables`
- `Invoice & E-Invoicing Compliance`
- `Financial Reporting`

### 9.2 Finance backbone

The financial architecture is based on `financial obligation` as an internal
business concept.

This means the platform tracks:

- what a learner owes
- what the center owes a teacher
- what the branch owes as an operating expense
- what has been paid
- what remains outstanding

`Billing` is therefore broader than an invoice screen, but narrower than the
whole finance domain.

## 10. Pricing & Promotion

This capability defines how academic participation becomes a financial commitment.

### 10.1 Required support

- full-program pricing
- monthly pricing
- per-session pricing
- installment plans
- discounts
- scholarships
- vouchers
- referral incentives
- special negotiated offers

### 10.2 Business rule

Pricing is not determined only by program catalog.
Financial commitment is ultimately determined at the learner participation level.

## 11. Billing

Billing is responsible for turning academic participation into money that should
be collected.

### 11.1 Core capabilities

- `Financial Terms`
- `Charge Schedule`
- `Receivable Items`
- `Due Dates`
- `Debt Status`
- `Adjustments`
- `Waivers`
- `Carry-forward`
- `Refundable balance context`

### 11.2 Core rule

`Enrollment` and `Financial Terms` are separate.

This is required because:

- students in the same class may pay differently
- students may skip expected progression
- students may move class, pause, or rejoin
- promotions and negotiated terms may vary by learner

## 12. Payments & Reconciliation

This capability manages actual money movement.

### 12.1 Core capabilities

- `Payment Request`
- `Payment Method`
- `Cash Collection`
- `Bank Transfer Recording`
- `VietQR`
- `Payment Transaction`
- `Partial Payment`
- `Overpayment`
- `Underpayment`
- `Manual Reconciliation`
- `Auto-reconciliation readiness`

### 12.2 Phase direction

Phase-early support should include:

- cash
- bank transfer
- VietQR

The model must remain ready for payment-link or gateway integration later.

### 12.3 Core rule

One bill may be paid by multiple transactions.
One transaction may need allocation across multiple receivable items.

## 13. Invoice & E-Invoicing Compliance

Invoices are mandatory as a first-class capability.

This is required both for business trust and for Vietnamese legal and tax
readiness.

### 13.1 Core capabilities

- `Invoice Draft`
- `Issued Invoice`
- `Invoice Line Items`
- `Invoice Status`
- `Invoice Adjustment`
- `Invoice Replacement`
- `Invoice Cancellation`
- `Tax-ready invoice data`
- `Provider integration readiness`

### 13.2 Core rule

Not every financial record is an invoice.

Examples:

- tuition collection may generate invoice output
- teacher revenue share payout is not the same kind of invoice event
- operating expenses are payable-side events with different source documents

### 13.3 Compliance direction

The architecture must stay ready for strict electronic invoice workflows under
Vietnamese tax practice, even if provider integration is phased.

## 14. Teacher Settlement

Teacher Settlement governs how the center pays teachers or teaching partners.

### 14.1 Core models to support

- fixed salary
- per-session compensation
- revenue share
- hybrid arrangements

### 14.2 Required separation

`Teacher Assignment` and `Teacher Commercial Terms` are separate concepts.

This is necessary because:

- one teacher may teach under different commercial models
- terms may change over time
- assignment history must stay stable
- teacher-led and center-led classes require different payout logic

### 14.3 Settlement outputs

- payable amount by cycle
- settlement statement
- exception adjustment
- branch attribution

## 15. Expenses & Payables

The system must support real operating costs, not only tuition collection.

### 15.1 Expense categories

- staff salary
- center-employed teacher salary
- teacher revenue-share payout
- rent
- electricity
- water
- internet
- cleaning
- marketing
- admissions costs
- sales or referral commissions
- facility maintenance
- equipment and supplies
- branch-specific expenses
- shared overhead

### 15.2 Core rule

The system must distinguish:

- branch-specific costs
- tenant-wide shared overhead

without forcing full accounting complexity too early.

## 16. Reporting & Control

This domain helps owners and managers operate and monitor the center.

### 16.1 Operational reporting

- active learners
- class fill rate
- room utilization
- teacher utilization
- schedule conflicts
- transfer and hold trends

### 16.2 Financial reporting

- revenue by branch
- revenue by program
- revenue by class
- accounts receivable aging
- teacher payable status
- operating costs by branch
- management P&L view

## 17. Core Cross-Domain Flows

### 17.1 Admissions to learning flow

`Lead/Prospect -> consultation/assessment -> admission recommendation ->
promotion/pricing offer -> enrollment -> class participation`

### 17.2 Learning to billing flow

`Enrollment -> financial terms -> receivable schedule -> invoice-ready
billing items`

### 17.3 Billing to payment flow

`Billing items -> payment request -> payment transaction -> reconciliation ->
debt status update`

### 17.4 Teaching to settlement flow

`Teacher assignment + teacher commercial terms -> settlement calculation ->
payable items -> payment`

### 17.5 Operations to management control flow

`Programs/classes/schedules/payments/expenses -> reports -> operational and
financial decisions`

## 18. Boundaries and Exclusions

This document intentionally does not detail:

- LMS-heavy homework and assessment systems
- Study Abroad workflow
- Labor Export workflow
- full accounting ledger design
- tax engine design
- generalized agreement engine
- generic workflow engine for every future domain

These may be added later, but they are not required to validate the Academic
business architecture.

The architecture does, however, reserve explicit boundaries for the most likely
future capabilities so today's domains do not grow into their space:

### 18.1 LMS (learning delivery)

Should own: curriculum, lesson content, homework, assessment, learning progress.

Should use: `Identity & Organization Core` for people, `Academic Delivery` for
class/enrollment truth, `Scheduling & Resources` for session and attendance
facts, `Finance` through the charge basis if learning products are sold.

Must not: absorb enrollment truth, or push content/homework concepts into
`Academic Delivery` before the LMS domain exists.

### 18.2 AI-assisted capabilities

AI features are a consumer layer, not a domain. They read through reporting
projections, events, and audit history, and act only by proposing commands to
the owning contexts (lead scoring, debt-collection prioritization, scheduling
suggestions, guardian-facing assistants).

AI must never write business truth directly: AI proposes, modules dispose.

### 18.3 Communication and notification

Notification is an event consumer with channel adapters for Vietnam-first
channels (Zalo ZNS, SMS, email), with templates anchored in the shared core.
Business modules emit events; they do not send messages themselves. Tuition
reminders are a notification concern fed by finance events, not a finance
capability.

### 18.4 Task / work management

A dedicated light platform module for human work items: assignee, due date,
status, and a module-agnostic link to the business record the task is about
(same polymorphic philosophy as the finance charge basis). First consumers:
admissions follow-ups (call back, placement appointment), finance collection
tasks, and later study-abroad document checklists.

Boundaries:

- Tasks are the human-work layer **on top of** module lifecycles. Business
  state machines (enrollment status, invoice lifecycle, case pipeline) stay
  owned by their modules — this reservation is not a generic workflow engine,
  which remains a non-goal.
- Task due-dates feed the notification capability; they do not send messages
  themselves.
- AI-proposed actions materialize as suggested tasks for humans to accept —
  this is the natural surface for "AI proposes, modules dispose".
- Scope guard: tasks linked to business records are the value; do not drift
  into a standalone project-management tool.

## 19. Architectural Conclusion

The Academic business architecture should be understood as:

- a SaaS for Vietnam education center operations
- centered on programs, classes, people, schedules, and finance
- capable of supporting both center-led and teacher-led operating models
- financially serious enough to cover billing, payment, invoice readiness,
  settlement, and operating costs
- intentionally separated from future service domains such as Study Abroad and
  Labor Export

The key structural decisions in v1 are:

1. `Program -> Class` is the academic delivery backbone.
2. `Role` and `Data Scope` are separate.
3. `Enrollment` is separate from `Financial Terms`.
4. `Teacher Assignment` is separate from `Teacher Commercial Terms`.
5. `Finance` is broader than `Billing`.
6. `Invoice` is mandatory as a first-class capability.
