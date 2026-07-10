# Academic Business Rules & Policy Catalog v1

| Field      | Value                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status     | Draft for review                                                                                                                                                                |
| Date       | 2026-07-06                                                                                                                                                                      |
| Scope      | Academic / teaching-center business rules                                                                                                                                       |
| Depends on | `docs/business/academic-business-architecture.md`, `docs/business/academic-context-map.md`, `docs/business/academic-business-objects.md`, `docs/business/academic-workflows.md` |

## 1. Purpose

This document captures the core business rules and policies that govern Academic
operations, finance, access, and control.

Its goal is to define the important constraints that later technical design must
enforce consistently in:

- application services
- validations
- policy layers
- state transitions
- reporting logic

This document does not define implementation formulas or database constraints yet.
It defines business truth that technical design must preserve.

## 2. Rule Categories

The rules are grouped into these categories:

1. Access and organizational rules
2. Admissions and enrollment rules
3. Academic delivery rules
4. Scheduling and resource rules
5. Financial rules
6. Invoice and payment rules
7. Teacher settlement rules
8. Reporting and control rules

## 3. Access and Organizational Rules

## Rule A1: Tenant separation is absolute

- `Category`: Access and organizational
- `Rule`: Business data from one tenant must never be visible or actionable from another tenant.
- `Why`: SaaS isolation is non-negotiable.
- `Impacted contexts`: all contexts

## Rule A2: Role and data scope are separate concepts

- `Category`: Access and organizational
- `Rule`: authorization role does not automatically determine business data visibility.
- `Why`: a branch manager, regional manager, and teacher may all need different scopes even with overlapping permissions.
- `Impacted contexts`: `Identity & Organization Core`, all operational contexts

## Rule A3: Branch is a first-class operating unit

- `Category`: Access and organizational
- `Rule`: classes, rooms, staff activity, learner operations, payments, and costs may need branch attribution.
- `Why`: branch-level control is central to many education center operating models in Vietnam.
- `Impacted contexts`: `Academic Delivery`, `Scheduling & Resources`, `Finance`, `Reporting & Control`

## Rule A4: Product modules are enabled per tenant

- `Category`: Access and organizational
- `Rule`: each tenant has an explicit set of enabled product modules; features of a disabled module must be invisible and inactive for that tenant.
- `Why`: the commercial strategy is modular selling — center management now, study abroad, labor export, or LMS later, purchased separately.
- `Impacted contexts`: `Identity & Organization Core`, all product contexts

## Rule A5: Person identity is not keyed by contact info

- `Category`: Access and organizational
- `Rule`: phone numbers and other contact info may legitimately repeat across persons (a guardian's phone attached to several children) and must never be a hard uniqueness key for `Person`. Guardians are their own `Person` holding their own contact info, linked to learners via guardian relationships — do not stuff a parent's phone into the learner record.
- `Why`: shared family phones are the norm in Vietnam; hard-unique phone constraints force data corruption at the front desk.
- `Impacted contexts`: `Identity & Organization Core`, `Admissions`, `Academic Delivery`

## Rule A6: Person duplicate handling is assist-and-merge, not prevent

- `Category`: Access and organizational
- `Rule`: person creation runs a soft duplicate check (normalized name + date of birth, shared contact info) that warns with candidates but never blocks. Person merge is a first-class audited operation: pick a survivor, re-point all references, keep the merged record as a tombstone pointing to the survivor. Every module that references a person must register its referencing columns so merge can re-point them.
- `Why`: duplicates will happen (two receptionists, one child); two real people can share name and birth date, so hard blocking is wrong — the platform needs detection plus a safe merge.
- `Impacted contexts`: `Identity & Organization Core`, all contexts referencing persons

## 4. Admissions and Enrollment Rules

## Rule E1: A lead is not an enrollment

- `Category`: Admissions and enrollment
- `Rule`: a learner must not be treated as academically enrolled until a formal conversion step occurs.
- `Why`: pre-enrollment interest and active study are different business states.
- `Impacted contexts`: `Admissions`, `Academic Delivery`, `Finance`

## Rule E2: Teacher-sourced intake is a valid first-class intake path

- `Category`: Admissions and enrollment
- `Rule`: the platform must support learner intake through teacher-led acquisition without forcing a full retail-style admissions funnel.
- `Why`: this is a common and important operating model in Vietnam.
- `Impacted contexts`: `Admissions`, `Academic Delivery`, `Finance`

## Rule E3: Placement may influence target class, but does not itself create enrollment

- `Category`: Admissions and enrollment
- `Rule`: placement or assessment outcomes are advisory inputs into enrollment decisions.
- `Why`: assessment result and actual class participation are not the same thing.
- `Impacted contexts`: `Admissions`, `Academic Delivery`

## Rule E4: Enrollment is the source of truth for active study participation

- `Category`: Admissions and enrollment
- `Rule`: once a learner is actively studying, `Enrollment` becomes the authoritative academic participation record.
- `Why`: operational truth must be unambiguous.
- `Impacted contexts`: `Academic Delivery`, `Finance`, `Reporting & Control`

## Rule E5: Enrollment and learner financial commitment are separate

- `Category`: Admissions and enrollment
- `Rule`: `Enrollment` must not directly contain the full learner financial agreement.
- `Why`: academic participation and financial terms change for different reasons and at different times.
- `Impacted contexts`: `Academic Delivery`, `Finance`

## 5. Academic Delivery Rules

## Rule D1: Program and Class are separate business objects

- `Category`: Academic delivery
- `Rule`: `Program` represents an offering family, while `Class` represents the actual operational teaching unit.
- `Why`: one term must not carry both catalog and live-operational meaning.
- `Impacted contexts`: `Academic Delivery`, `Admissions`, `Finance`

## Rule D2: Class may carry progression meaning without a separate Stage entity

- `Category`: Academic delivery
- `Rule`: v1 may represent level or progression semantics as properties of `Class`.
- `Why`: this keeps operations simple while still supporting level-based teaching models.
- `Impacted contexts`: `Academic Delivery`, `Admissions`, `Finance`

## Rule D3: Skip-level progression is allowed when business decides so

- `Category`: Academic delivery
- `Rule`: a learner may move into a more advanced class without passing through every expected intermediate class.
- `Why`: this is common in real academic operations, especially with placement-based programs.
- `Impacted contexts`: `Academic Delivery`, `Finance`

## Rule D4: Transfer is a business event, not a silent edit

- `Category`: Academic delivery
- `Rule`: changing a learner's academic participation from one class arrangement to another must be recorded as a transfer-like event.
- `Why`: transfers affect auditability, schedule, and financial consequences.
- `Impacted contexts`: `Academic Delivery`, `Finance`, `Scheduling & Resources`

## Rule D5: Hold/Pause is distinct from dropout

- `Category`: Academic delivery
- `Rule`: temporary inactivity must be modeled separately from permanent termination.
- `Why`: pause often preserves return rights, billing adjustments, or class re-entry options.
- `Impacted contexts`: `Academic Delivery`, `Finance`

## Rule D6: Teacher assignment is distinct from teacher compensation

- `Category`: Academic delivery
- `Rule`: assigning a teacher to teach a class does not itself define how the teacher is paid.
- `Why`: operational participation and commercial settlement must remain separable.
- `Impacted contexts`: `Academic Delivery`, `Finance`

## 6. Scheduling and Resource Rules

## Rule S1: A room cannot host conflicting class sessions

- `Category`: Scheduling and resource
- `Rule`: the same room must not be assigned to overlapping class sessions.
- `Why`: this is a hard operational feasibility constraint.
- `Impacted contexts`: `Scheduling & Resources`

## Rule S2: A teacher cannot be assigned to conflicting teaching sessions

- `Category`: Scheduling and resource
- `Rule`: the same teacher must not be scheduled for overlapping active class delivery commitments.
- `Why`: one teacher cannot physically teach two classes at the same time.
- `Impacted contexts`: `Scheduling & Resources`, `Academic Delivery`

## Rule S3: Room capacity must be respected

- `Category`: Scheduling and resource
- `Rule`: a room should not be treated as valid for a class if expected attendance materially exceeds room capacity.
- `Why`: capacity is part of real operational feasibility.
- `Impacted contexts`: `Scheduling & Resources`, `Academic Delivery`

## Rule S4: Schedule feasibility belongs to Scheduling & Resources

- `Category`: Scheduling and resource
- `Rule`: academic contexts may define a class, but only scheduling context determines whether it can run operationally as planned.
- `Why`: schedule truth must have a clear owner.
- `Impacted contexts`: `Academic Delivery`, `Scheduling & Resources`

## Rule S5: Make-up and rescheduled sessions are first-class operational facts

- `Category`: Scheduling and resource
- `Rule`: schedule exceptions must not be treated as informal notes only.
- `Why`: exceptions can affect attendance, teaching load, and settlement.
- `Impacted contexts`: `Scheduling & Resources`, `Academic Delivery`, `Finance`

## Rule S6: Session occurrence and attendance are recorded facts

- `Category`: Scheduling and resource
- `Rule`: whether a session actually ran and who actually taught it is owned by `Scheduling & Resources`; which learners were actually present is owned by `Academic Delivery`. Both are first-class recorded facts, not informal notes.
- `Why`: per-session pricing, teacher settlement, guardian communication, and future learning-delivery features all depend on these facts.
- `Impacted contexts`: `Scheduling & Resources`, `Academic Delivery`, `Finance`

## 7. Financial Rules

## Rule F1: Finance is broader than billing

- `Category`: Financial
- `Rule`: the finance domain includes billing, payment, invoice, settlement, expenses, and payables.
- `Why`: the center must control full operating finance, not only tuition collection.
- `Impacted contexts`: `Finance`, `Reporting & Control`

## Rule F2: Learner financial commitment is determined at the enrollment level

- `Category`: Financial
- `Rule`: final financial commitment for a learner is determined by `Financial Terms`, not by program default alone.
- `Why`: different learners in the same class may owe different amounts or schedules.
- `Impacted contexts`: `Finance`, `Academic Delivery`

## Rule F3: Skip-level progression must not charge skipped academic participation by default

- `Category`: Financial
- `Rule`: if a learner does not actually participate in an intermediate study step, the system must not automatically charge for that skipped step.
- `Why`: business charges should reflect real committed participation, not assumed sequence.
- `Impacted contexts`: `Finance`, `Academic Delivery`

## Rule F4: Promotions affect financial terms, not payment truth directly

- `Category`: Financial
- `Rule`: promotions and special offers shape the learner's financial commitment before or during billing generation.
- `Why`: they are commercial modifiers, not payment events.
- `Impacted contexts`: `Admissions`, `Finance`

## Rule F5: Branch-specific and shared costs must remain distinguishable

- `Category`: Financial
- `Rule`: the system must distinguish costs caused by a branch from costs shared across the whole tenant.
- `Why`: branch-level operating control and management P&L depend on this distinction.
- `Impacted contexts`: `Finance`, `Reporting & Control`

## Rule F6: Receivable and payable must remain separate

- `Category`: Financial
- `Rule`: money owed by learners and money owed by the center to other parties must not collapse into one undifferentiated obligation bucket.
- `Why`: their lifecycle, reporting, and business ownership differ.
- `Impacted contexts`: `Finance`

## Rule F7: Finance money records are origin-agnostic

- `Category`: Financial
- `Rule`: receivable, payment, allocation, and invoice records reference their business origin through a `Charge Basis`, never through structural dependence on one product module's records. Each product module brings its own financial-terms concept, which produces charge bases.
- `Why`: adding study abroad, labor export, or LMS must not require modifying core finance structures.
- `Impacted contexts`: `Finance`, all product contexts

## 8. Payment and Invoice Rules

## Rule P1: Payment request is distinct from payment transaction

- `Category`: Payment and invoice
- `Rule`: a request for payment does not prove that payment happened.
- `Why`: billing and cash movement are different business states.
- `Impacted contexts`: `Finance`

## Rule P2: Partial payment must be supported

- `Category`: Payment and invoice
- `Rule`: a receivable may be paid in multiple parts.
- `Why`: installment behavior and practical family payment patterns require it.
- `Impacted contexts`: `Finance`

## Rule P3: One payment may cover multiple receivables

- `Category`: Payment and invoice
- `Rule`: a single received transaction may need to be allocated across more than one learner charge.
- `Why`: real-world transfers often do not map one-to-one to bills.
- `Impacted contexts`: `Finance`

## Rule P4: Invoice is mandatory as a first-class capability

- `Category`: Payment and invoice
- `Rule`: the system must support invoice lifecycle as a formal business capability.
- `Why`: tuition collection requires business-grade and legally ready documentation.
- `Impacted contexts`: `Finance`

## Rule P5: Invoice is not the same as receivable

- `Category`: Payment and invoice
- `Rule`: invoice document lifecycle and receivable lifecycle are related but not identical.
- `Why`: a receivable can exist before, during, or beyond an invoice state, depending on business process.
- `Impacted contexts`: `Finance`

## Rule P6: Invoice is not the same as payment

- `Category`: Payment and invoice
- `Rule`: issuing an invoice does not mean money has been collected.
- `Why`: documentation and cash receipt are separate states.
- `Impacted contexts`: `Finance`

## Rule P7: Cash, bank transfer, and VietQR are phase-early payment methods

- `Category`: Payment and invoice
- `Rule`: the early platform must support these methods as first-class payment channels.
- `Why`: they fit real center operations in Vietnam.
- `Impacted contexts`: `Finance`

## Rule P8: A payment transaction belongs to the paying party

- `Category`: Payment and invoice
- `Rule`: a payment transaction is attached to the party who actually paid (often a guardian), and allocation connects it to receivables — including receivables of multiple learners.
- `Why`: one guardian transfer commonly covers tuition for several children; the model must support this without contortion.
- `Impacted contexts`: `Finance`, `Identity & Organization Core`

## 9. Teacher Settlement Rules

## Rule T1: Teacher compensation model is not fixed globally

- `Category`: Teacher settlement
- `Rule`: the platform must support different compensation models across teachers or class arrangements.
- `Why`: center-led and teacher-led classes operate differently.
- `Impacted contexts`: `Finance`, `Academic Delivery`

## Rule T2: Revenue share is a first-class compensation model

- `Category`: Teacher settlement
- `Rule`: teacher compensation may be based on a configurable share of class-related revenue.
- `Why`: this is common in teacher-led extra-study operating models.
- `Impacted contexts`: `Finance`

## Rule T3: Settlement must be calculated from both commercial terms and operational facts

- `Category`: Teacher settlement
- `Rule`: teacher payout cannot be determined from assignment alone.
- `Why`: valid payout may depend on teaching participation, class activity, or session facts.
- `Impacted contexts`: `Finance`, `Academic Delivery`, `Scheduling & Resources`

## Rule T4: Teacher settlement output must be payable, not implicit

- `Category`: Teacher settlement
- `Rule`: the result of teacher compensation logic must become explicit payable records.
- `Why`: accounting control and payout tracking require explicit outputs.
- `Impacted contexts`: `Finance`

## 10. Reporting and Control Rules

## Rule R1: Reporting is downstream from source contexts

- `Category`: Reporting and control
- `Rule`: reports and dashboards must not become hidden source-of-truth systems.
- `Why`: transactional truth must stay in owning contexts.
- `Impacted contexts`: `Reporting & Control`, all source contexts

## Rule R2: Management P&L is a control view, not a ledger substitute

- `Category`: Reporting and control
- `Rule`: management profitability views are decision-support projections, not full accounting ledgers.
- `Why`: the platform needs operational financial control before full accounting complexity.
- `Impacted contexts`: `Finance`, `Reporting & Control`

## Rule R3: Operational and financial reporting must remain linkable

- `Category`: Reporting and control
- `Rule`: management must be able to relate class operations to revenue, debt, settlement, and cost impact.
- `Why`: the platform's value depends on connecting teaching operations with business control.
- `Impacted contexts`: `Academic Delivery`, `Scheduling & Resources`, `Finance`, `Reporting & Control`

## 11. Priority Rules for Technical Design

The following rules are the most critical to preserve when moving into technical design:

1. `Tenant` separation is absolute.
2. `Role` and `Data Scope` are separate.
3. `Program` and `Class` are separate.
4. `Enrollment` and `Financial Terms` are separate.
5. `Teacher Assignment` and `Teacher Commercial Terms` are separate.
6. `Billing`, `Payment`, and `Invoice` are separate.
7. `Teacher-led` intake and compensation are first-class.
8. `Skip-level` participation must not automatically charge skipped learning steps.
9. `Transfer`, `Hold`, and `Re-entry` are business events, not silent edits.
10. `Branch-specific` and `shared` financial costs must remain distinguishable.
11. Finance records reference a `Charge Basis`, never a product module's records directly.
12. `Payment Transaction` belongs to the paying party, not to an enrollment.
13. `Session occurrence` and `Attendance` are recorded facts with clear owners.
14. Product modules are enabled per tenant via `Module Entitlement`.
15. `Person` duplicates are detected and merged, never hard-blocked by contact info.

## 12. Architectural Conclusion

This policy catalog completes the minimum business rule layer needed before moving
into technical design.

Together with the other business documents, it gives the project:

- domain boundaries
- owned business objects
- canonical workflows
- non-negotiable rules and policies

This is the final business layer checkpoint before:

- module boundary design
- technical domain model
- schema design
- API and application service planning
