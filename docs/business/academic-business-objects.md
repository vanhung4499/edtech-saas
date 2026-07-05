# Academic Business Objects Catalog v1

| Field      | Value                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------ |
| Status     | Draft for review                                                                           |
| Date       | 2026-07-04                                                                                 |
| Scope      | Academic / teaching-center business objects                                                |
| Depends on | `docs/business/academic-business-architecture.md`, `docs/business/academic-context-map.md` |

## 1. Purpose

This document defines the core business objects for the Academic platform.

Its goal is to create a stable business vocabulary before technical domain model,
database schema, or API design begins. Each object below is described in business
terms, not implementation terms.

This document answers:

- what each important business object means
- which context owns it
- what it must represent
- what it must not represent
- which nearby objects are often confused with it

## 2. Reading Guide

Each object is described using the same structure:

- `Owner Context`
- `Definition`
- `Why it exists`
- `Must include`
- `Must not include`
- `Common confusions`

## 3. Shared Core Objects

## 3.1 Tenant

- `Owner Context`: `Identity & Organization Core`
- `Definition`: the top-level business customer workspace using the platform.
- `Why it exists`: all data, access control, and operations must belong to a tenant.
- `Must include`: tenant identity, operating status, business settings envelope.
- `Must not include`: day-to-day class, payment, or admissions workflow state.
- `Common confusions`: tenant is not the same as a branch.

## 3.2 Branch

- `Owner Context`: `Identity & Organization Core`
- `Definition`: a physical or operational center location under a tenant.
- `Why it exists`: academic operations, rooms, schedules, payments, and costs often
  need branch-level separation.
- `Must include`: branch identity, branch code, operational ownership.
- `Must not include`: independent tenant-like identity or duplicated user model.
- `Common confusions`: branch is not merely an address field; it is an operating unit.

## 3.3 Person

- `Owner Context`: `Identity & Organization Core`
- `Definition`: the shared human identity backbone used across academic and future domains.
- `Why it exists`: one person may appear as learner, guardian, teacher, or staff
  depending on context.
- `Must include`: identity, basic contact profile, relationship anchors.
- `Must not include`: domain workflow state such as enrollment or invoice status.
- `Common confusions`: person is not the same as student, teacher, or user account.

## 3.4 User Account

- `Owner Context`: `Identity & Organization Core`
- `Definition`: the login and access identity used to operate the system.
- `Why it exists`: not every person is a user, and not every user must be modeled
  as a single business role.
- `Must include`: authentication identity, access status, role bindings.
- `Must not include`: business participation records such as learner enrollment.
- `Common confusions`: user account is not the same as person.

## 3.5 Role

- `Owner Context`: `Identity & Organization Core`
- `Definition`: a named bundle of permissions.
- `Why it exists`: the system needs reusable authorization semantics.
- `Must include`: permission grouping semantics.
- `Must not include`: branch visibility rules by itself.
- `Common confusions`: role is not the same as data scope.

## 3.6 Data Scope

- `Owner Context`: `Identity & Organization Core`
- `Definition`: the rule describing what business data a user can see or act on.
- `Why it exists`: Vietnamese education centers often require branch-based and
  self-based access boundaries.
- `Must include`: tenant-wide, branch-specific, branch-set, or self-like visibility semantics.
- `Must not include`: business role semantics such as accountant or teacher.
- `Common confusions`: data scope is not the same as role.

## 4. Admissions Objects

## 4.1 Lead

- `Owner Context`: `Admissions`
- `Definition`: a person or contact record with initial interest but not yet
  qualified for active academic participation.
- `Why it exists`: academic centers need to track inquiry and recruitment sources.
- `Must include`: source, contactability, responsible staff, interest context.
- `Must not include`: active enrollment truth.
- `Common confusions`: lead is not prospect and not enrolled learner.

## 4.2 Prospect

- `Owner Context`: `Admissions`
- `Definition`: a qualified pre-enrollment candidate more likely to convert into study.
- `Why it exists`: not every lead is ready for class recommendation or offer.
- `Must include`: qualification context, target interest, handling state.
- `Must not include`: final academic participation state.
- `Common confusions`: prospect is not yet an enrollment.

## 4.3 Source Channel

- `Owner Context`: `Admissions`
- `Definition`: the business source through which a lead or learner entered the funnel.
- `Why it exists`: source matters for admissions strategy and promotion analysis.
- `Must include`: named acquisition origin such as walk-in, referral, teacher-sourced,
  social media, website, partner.
- `Must not include`: payment or class logic.
- `Common confusions`: source channel is not the same as promotion.

## 4.4 Consultation

- `Owner Context`: `Admissions`
- `Definition`: an advisory interaction intended to move a candidate toward enrollment.
- `Why it exists`: language centers and high-touch academic centers often need
  structured pre-enrollment conversations.
- `Must include`: advisor, notes, recommendation context.
- `Must not include`: final class participation truth.
- `Common confusions`: consultation is not the same as placement outcome.

## 4.5 Placement Assessment

- `Owner Context`: `Admissions`
- `Definition`: an evaluation used to determine suitable academic entry point.
- `Why it exists`: many language or level-based programs need proper class targeting.
- `Must include`: assessed result, recommendation signal, evaluation context.
- `Must not include`: final class assignment by itself.
- `Common confusions`: assessment is input into enrollment, not enrollment itself.

## 4.6 Promotion Offer

- `Owner Context`: `Admissions` with `Finance` impact
- `Definition`: a pre-enrollment commercial offer that may influence learner conversion.
- `Why it exists`: tuition decisions are often shaped before formal enrollment.
- `Must include`: offer condition, intended benefit, target learner or cohort context.
- `Must not include`: final receivable truth.
- `Common confusions`: promotion offer is not yet billing.

## 5. Academic Delivery Objects

## 5.1 Program

- `Owner Context`: `Academic Delivery`
- `Definition`: the top-level academic offering family that groups related learning delivery.
- `Why it exists`: the product needs a business object broader and clearer than overloaded
  words like course.
- `Must include`: offering identity, teaching family semantics, business ownership.
- `Must not include`: room schedule or payment transaction history.
- `Common confusions`: program is not a class and not a learner-specific path.

Examples:

- HSK
- IELTS
- Toan THCS thay Dung
- Tieng Anh thieu nhi

## 5.2 Program Offering

- `Owner Context`: `Academic Delivery`
- `Definition`: the tenant or branch-specific marketable offering of a program.
- `Why it exists`: the same abstract program may be operated differently by center,
  branch, or time window.
- `Must include`: offering identity, active availability context, branch relevance if needed.
- `Must not include`: per-learner contractual truth.
- `Common confusions`: program offering is not a live class.

## 5.3 Class

- `Owner Context`: `Academic Delivery`
- `Definition`: the operational teaching unit in which learners actually study.
- `Why it exists`: most center operations happen around actual classes, not abstract programs.
- `Must include`: class identity, linked program, academic grouping semantics, operating status.
- `Must not include`: full room schedule ownership or payment ledger truth.
- `Common confusions`: class is not the same as program, invoice, or room booking.

Examples:

- HSK1-A
- HSK3-Toi-246
- 6-1
- 6-2

## 5.4 Class Level Semantics

- `Owner Context`: `Academic Delivery`
- `Definition`: the academic progression meaning attached to a class without requiring
  a separate stage entity in v1.
- `Why it exists`: learners may skip levels, transfer between classes, or enter at
  different points while operations still remain class-centered.
- `Must include`: level code, progression rank, entry notes, suitability semantics.
- `Must not include`: full independent workflow state unless later promoted to its own object.
- `Common confusions`: class level semantics is not a live class and not a payment plan.

## 5.5 Enrollment

- `Owner Context`: `Academic Delivery`
- `Definition`: the academic participation record linking a learner to a class or
  active study instance.
- `Why it exists`: the system must know who is actually studying what.
- `Must include`: learner, class, participation status, effective period.
- `Must not include`: full financial terms or payment truth.
- `Common confusions`: enrollment is not invoice, payment, or lead state.

## 5.6 Enrollment Status

- `Owner Context`: `Academic Delivery`
- `Definition`: the academic state of a learner's participation.
- `Why it exists`: operational flows need to distinguish studying, paused, transferred,
  completed, dropped, and similar states.
- `Must include`: current academic lifecycle meaning.
- `Must not include`: debt state.
- `Common confusions`: enrollment status is not payment status.

## 5.7 Transfer

- `Owner Context`: `Academic Delivery`
- `Definition`: the business event that moves a learner from one academic participation
  setup to another.
- `Why it exists`: real centers need class changes, time-slot moves, and level jumps.
- `Must include`: source, target, effective date, reason.
- `Must not include`: financial settlement logic itself.
- `Common confusions`: transfer is not merely editing a class field.

## 5.8 Hold / Pause

- `Owner Context`: `Academic Delivery`
- `Definition`: a temporary stop in active participation without fully deleting learner history.
- `Why it exists`: academic centers often need reserve, pause, or temporary leave behavior.
- `Must include`: pause period, reason, expected return semantics if known.
- `Must not include`: direct financial recalculation rules.
- `Common confusions`: hold is not dropout and not refund by itself.

## 5.9 Teacher Assignment

- `Owner Context`: `Academic Delivery`
- `Definition`: the operational relationship between a teacher and a class.
- `Why it exists`: the system must know who is teaching which class.
- `Must include`: teacher, class, role in delivery, effective period.
- `Must not include`: payout logic or revenue share formula.
- `Common confusions`: teacher assignment is not teacher salary rule.

## 6. Scheduling & Resources Objects

## 6.1 Room

- `Owner Context`: `Scheduling & Resources`
- `Definition`: a physical teaching space that can host classes.
- `Why it exists`: room conflicts and room utilization are central operating problems.
- `Must include`: room identity, branch, capacity, availability context.
- `Must not include`: learner roster or invoice state.
- `Common confusions`: room is not class.

## 6.2 Time Slot

- `Owner Context`: `Scheduling & Resources`
- `Definition`: a reusable temporal unit for scheduling classes.
- `Why it exists`: centers need consistent operating patterns across classes.
- `Must include`: temporal definition, slot meaning.
- `Must not include`: ownership of class enrollment.
- `Common confusions`: time slot is not a complete schedule by itself.

## 6.3 Recurring Schedule

- `Owner Context`: `Scheduling & Resources`
- `Definition`: the repeated timing pattern under which a class is intended to run.
- `Why it exists`: most classes operate on repeating weekly patterns.
- `Must include`: cadence, day/time structure, effective range.
- `Must not include`: room or teacher payment truth.
- `Common confusions`: recurring schedule is not actual attendance history.

## 6.4 Session Calendar

- `Owner Context`: `Scheduling & Resources`
- `Definition`: the actual dated sessions a class is expected or adjusted to run.
- `Why it exists`: holidays, make-up classes, and substitutions break simple recurrence.
- `Must include`: actual session instances or equivalent operational session truth.
- `Must not include`: billing truth by default.
- `Common confusions`: session calendar is not payment schedule.

## 6.5 Conflict Detection

- `Owner Context`: `Scheduling & Resources`
- `Definition`: the decision object or rule outcome indicating invalid operational overlap.
- `Why it exists`: the center cannot run two incompatible classes in the same room
  or with the same teacher at the same time.
- `Must include`: conflict type, affected resources, decision rationale.
- `Must not include`: final admissions or financial outcomes.
- `Common confusions`: conflict detection is not merely a UI warning; it is business control.

## 7. Finance Objects

## 7.1 Pricing Rule

- `Owner Context`: `Finance`
- `Definition`: the business rule describing how a program or class may be priced.
- `Why it exists`: the same academic offering may support multiple charging models.
- `Must include`: pricing method semantics, applicability context.
- `Must not include`: learner-specific final obligation truth.
- `Common confusions`: pricing rule is not payment transaction and not invoice.

## 7.2 Enrollment Financial Terms

- `Owner Context`: `Finance`
- `Definition`: the learner-specific financial commitment attached to academic participation.
- `Why it exists`: learners in the same class may not owe the same amount or schedule.
- `Must include`: charge basis, amount logic, discount effects, expected collection pattern.
- `Must not include`: actual payment completion truth.
- `Common confusions`: enrollment financial terms is not enrollment itself.

## 7.3 Receivable Item

- `Owner Context`: `Finance`
- `Definition`: a concrete amount the learner owes the center.
- `Why it exists`: billing needs units that can become due, overdue, adjusted, or paid.
- `Must include`: amount, due date, charge reason, learner linkage.
- `Must not include`: payment method execution data.
- `Common confusions`: receivable item is not invoice, though it may appear on one.

## 7.4 Payment Request

- `Owner Context`: `Finance`
- `Definition`: the center's instruction or request for the payer to settle one or more receivables.
- `Why it exists`: billing truth and collection workflow are not the same thing.
- `Must include`: amount requested, payment method options, settlement target.
- `Must not include`: proof that money has actually arrived.
- `Common confusions`: payment request is not payment transaction.

## 7.5 Payment Transaction

- `Owner Context`: `Finance`
- `Definition`: a recorded money movement received from or paid to a party.
- `Why it exists`: the system must distinguish money requested from money actually moved.
- `Must include`: amount, method, received/paid timestamp, source evidence.
- `Must not include`: academic participation truth.
- `Common confusions`: payment transaction is not billing and not invoice.

## 7.6 Reconciliation

- `Owner Context`: `Finance`
- `Definition`: the matching process between financial items and actual transactions.
- `Why it exists`: one transaction may cover one or many receivables, partially or fully.
- `Must include`: allocation result, unmatched amount handling, status outcome.
- `Must not include`: independent pricing semantics.
- `Common confusions`: reconciliation is not collection method.

## 7.7 Invoice

- `Owner Context`: `Finance`
- `Definition`: the commercial and legal billing document issued for applicable charges.
- `Why it exists`: tuition and other eligible charges require formal documentation and
  must stay ready for Vietnamese electronic invoice compliance.
- `Must include`: issued document identity, billable line representation, legal status.
- `Must not include`: direct control of payment truth.
- `Common confusions`: invoice is not receivable item and not payment transaction.

## 7.8 Teacher Commercial Terms

- `Owner Context`: `Finance`
- `Definition`: the financial agreement logic describing how a teacher is compensated.
- `Why it exists`: center-led and teacher-led classes require different payout models.
- `Must include`: compensation model, rate or ratio semantics, effective period.
- `Must not include`: class assignment truth.
- `Common confusions`: teacher commercial terms is not teacher assignment.

## 7.9 Teacher Settlement

- `Owner Context`: `Finance`
- `Definition`: the computed payable outcome produced from teacher commercial rules
  and operational teaching facts.
- `Why it exists`: centers need a business object for what is owed to teachers in a cycle.
- `Must include`: cycle, payable amount, calculation basis, settlement state.
- `Must not include`: teacher identity master data or class roster truth.
- `Common confusions`: settlement is not salary rule and not payment transaction.

## 7.10 Expense Item

- `Owner Context`: `Finance`
- `Definition`: a recognized operating cost the center must bear.
- `Why it exists`: the platform must support complete center financial control, not only tuition inflow.
- `Must include`: cost category, amount, branch attribution, payable context.
- `Must not include`: revenue collection semantics.
- `Common confusions`: expense item is not receivable item.

## 7.11 Payable Item

- `Owner Context`: `Finance`
- `Definition`: a concrete amount the center owes to a teacher, vendor, landlord,
  or other counterparty.
- `Why it exists`: the business needs symmetry between what it must collect and what it must pay.
- `Must include`: amount owed, counterparty, due context, source reason.
- `Must not include`: learner enrollment status.
- `Common confusions`: payable item is not expense category and not settlement rule.

## 8. Reporting & Control Objects

## 8.1 Dashboard Metric

- `Owner Context`: `Reporting & Control`
- `Definition`: an aggregated business indicator shown for decision support.
- `Why it exists`: center owners and managers need concise operational and financial visibility.
- `Must include`: metric definition, calculation meaning, reporting dimension.
- `Must not include`: source transaction ownership.
- `Common confusions`: dashboard metric is not a source-of-truth transaction.

## 8.2 Management View

- `Owner Context`: `Reporting & Control`
- `Definition`: a read-oriented business projection for operating or financial control.
- `Why it exists`: decisions often need consolidated, denormalized business summaries.
- `Must include`: decision-focused aggregation semantics.
- `Must not include`: write ownership over source objects.
- `Common confusions`: management view is not a transactional context.

## 9. Most Important Distinctions

The following object pairs must remain separate:

1. `Person` vs `User Account`
2. `Role` vs `Data Scope`
3. `Lead/Prospect` vs `Enrollment`
4. `Program` vs `Class`
5. `Enrollment` vs `Enrollment Financial Terms`
6. `Teacher Assignment` vs `Teacher Commercial Terms`
7. `Receivable Item` vs `Invoice`
8. `Payment Request` vs `Payment Transaction`
9. `Expense Item` vs `Payable Item`
10. `Dashboard Metric` vs source transaction

## 10. Architectural Conclusion

This catalog establishes the minimum stable business vocabulary required before
technical modeling begins.

The most important business objects for the next stage are:

- `Person`
- `Branch`
- `Program`
- `Class`
- `Enrollment`
- `Teacher Assignment`
- `Enrollment Financial Terms`
- `Receivable Item`
- `Payment Transaction`
- `Invoice`
- `Teacher Commercial Terms`
- `Teacher Settlement`
- `Expense Item`

These objects should be reused consistently in:

- workflow documentation
- module boundary design
- domain model design
- database schema design
- API naming
