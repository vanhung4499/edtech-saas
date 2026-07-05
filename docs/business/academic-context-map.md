# Academic Context Map v1

| Field      | Value                                             |
| ---------- | ------------------------------------------------- |
| Status     | Draft for review                                  |
| Date       | 2026-07-04                                        |
| Scope      | Academic / teaching-center contexts only          |
| Depends on | `docs/business/academic-business-architecture.md` |

## 1. Purpose

This document defines the bounded contexts and context relationships for the
Academic part of the platform.

Its goal is to prevent business concepts from leaking across modules too early.
It is the bridge between high-level business architecture and later domain model,
module design, and schema design.

This document does not define database tables. It defines:

- business context boundaries
- source-of-truth ownership
- upstream/downstream relationships
- shared concepts
- integration responsibilities

## 2. Scope

This context map focuses only on the Academic platform scope:

- teaching-center operations
- admissions
- class delivery
- scheduling
- academic finance
- operational reporting

It intentionally excludes detailed modeling for:

- Study Abroad
- Labor Export
- LMS-heavy learning systems
- general ledger accounting

## 3. Context Overview

The Academic platform is split into six contexts:

1. `Identity & Organization Core`
2. `Admissions`
3. `Academic Delivery`
4. `Scheduling & Resources`
5. `Finance`
6. `Reporting & Control`

These contexts are not equal in business importance.

## 4. Context Classification

### 4.1 Core contexts

These contexts define the main business value of the platform.

- `Academic Delivery`
- `Finance`

Reason:

- `Academic Delivery` is where the center actually runs programs, classes,
  enrollments, and learner participation.
- `Finance` is where the center monetizes operations, tracks debt, settles with
  teachers, and controls operating health.

### 4.2 Supporting contexts

These contexts are essential but exist mainly to enable the core contexts.

- `Admissions`
- `Scheduling & Resources`

Reason:

- `Admissions` feeds learners into delivery and finance.
- `Scheduling & Resources` makes classes executable in the real world.

### 4.3 Shared core context

- `Identity & Organization Core`

Reason:

- all contexts depend on tenants, branches, people, users, roles, and data scope
- this context must be small, stable, and protected from workflow sprawl

### 4.4 Read-model / decision-support context

- `Reporting & Control`

Reason:

- it should aggregate information from other contexts
- it should not become the source of truth for operational writes

## 5. Context Definitions

## 5.1 Identity & Organization Core

### Purpose

Provide the shared organizational and identity backbone for the platform.

### Owns

- tenant
- branch
- user account
- role
- permission
- data scope
- person
- contact info
- guardian relationship
- document metadata
- audit trail backbone

### Does not own

- lead workflow
- enrollment workflow
- class logic
- payment flow
- teacher compensation logic

### Source-of-truth rule

If another context needs person, branch, or access information, it depends on
this context rather than redefining its own version.

## 5.2 Admissions

### Purpose

Manage the journey from interest to accepted learner participation.

### Owns

- lead
- prospect
- source channel
- consultation
- assessment / placement record
- admission recommendation
- admission offer inputs
- conversion intent into enrollment

### Depends on

- `Identity & Organization Core` for person, branch, staff, and scope
- `Academic Delivery` for valid program and class targets
- `Finance` for pricing/promotion inputs that affect offers

### Does not own

- active enrollment lifecycle after conversion
- tuition debt
- payment collection

### Source-of-truth rule

Admissions owns pre-enrollment commercial and advisory context.
Once a learner becomes actively enrolled, Academic Delivery becomes the source of
truth for study participation.

## 5.3 Academic Delivery

### Purpose

Manage what is taught, who joins, and how classes are operated academically.

### Owns

- program
- program offering
- class
- class-level learning semantics
- enrollment
- enrollment status
- transfer
- hold / pause
- re-entry
- teacher assignment from a teaching-operations perspective

### Depends on

- `Identity & Organization Core` for people, branches, users, and scope
- `Admissions` for accepted conversions and placement outcomes
- `Scheduling & Resources` for executable class timing and room feasibility
- `Finance` for learner financial terms and financial constraints when needed

### Does not own

- payment execution
- invoice issuance
- branch cost tracking
- room inventory truth

### Source-of-truth rule

Academic Delivery owns the operational truth of learner participation.
If the question is "what is this learner actually studying right now?" the answer
belongs here.

## 5.4 Scheduling & Resources

### Purpose

Manage the physical and temporal feasibility of academic delivery.

### Owns

- room / classroom
- room capacity
- time slot structures
- recurring schedules
- session calendar
- teacher availability
- room allocation
- schedule conflict detection
- reschedule records
- make-up sessions
- substitute-teacher records

### Depends on

- `Identity & Organization Core` for branches and teacher identity
- `Academic Delivery` for classes that require scheduling

### Does not own

- program definition
- enrollment status
- payment rules

### Source-of-truth rule

Scheduling & Resources owns the answer to:

- when a class runs
- where it runs
- whether it can run without operational conflict

## 5.5 Finance

### Purpose

Manage financial commitments, collection, settlement, expenses, and invoice
readiness for the Academic business.

### Owns

- pricing rules
- promotion financial effects
- enrollment financial terms
- receivable items
- due schedules
- payment requests
- payment transactions
- reconciliation state
- teacher commercial terms
- teacher settlement outputs
- expense and payable records
- invoice lifecycle
- tax-ready invoice data

### Depends on

- `Identity & Organization Core` for parties, branches, and access scope
- `Admissions` for promotional/admission offers when converted
- `Academic Delivery` for enrollment and class participation events
- `Scheduling & Resources` only when financial rules depend on class/session facts

### Does not own

- program catalog truth
- class schedule truth
- lead workflow truth

### Source-of-truth rule

Finance owns the answer to:

- what is owed
- what has been charged
- what has been paid
- what must be settled
- what costs the center has incurred
- what invoice/compliance state applies

## 5.6 Reporting & Control

### Purpose

Provide operational and financial visibility for decision-making.

### Owns

- dashboards
- KPI definitions
- read-model aggregations
- management views

### Depends on

- every other context

### Does not own

- operational write workflows
- financial source records
- class schedule decisions

### Source-of-truth rule

Reporting & Control is downstream from all transactional contexts.
It should not become a backdoor write surface for business operations.

## 6. Context Relationships

## 6.1 Identity & Organization Core -> all other contexts

Relationship type:

- upstream shared core

Implication:

- all contexts rely on the same tenant, branch, person, and access model
- no context should fork person or branch identity definitions

## 6.2 Admissions -> Academic Delivery

Relationship type:

- upstream conversion handoff

Implication:

- Admissions prepares the learner for joining
- Academic Delivery starts once the learner is accepted into actual study

Boundary rule:

- a lead or prospect is not automatically an enrollment
- a placement outcome may influence class targeting without owning class state

## 6.3 Admissions -> Finance

Relationship type:

- upstream offer input

Implication:

- promotions, admission offers, and conversion decisions can affect financial terms
- Admissions can suggest commercial conditions, but Finance owns the resulting
  financial records

## 6.4 Academic Delivery <-> Scheduling & Resources

Relationship type:

- strong collaboration with separate ownership

Implication:

- Academic Delivery defines the class that needs to exist
- Scheduling & Resources determines when and where it can exist

Boundary rule:

- classes are not schedule records
- schedules are not enrollment records

## 6.5 Academic Delivery -> Finance

Relationship type:

- upstream operational event source

Implication:

- enrollment, transfer, hold, re-entry, and class participation can create or
  adjust financial terms and charges

Boundary rule:

- Academic Delivery does not calculate final financial truth
- Finance does not redefine who is academically enrolled

## 6.6 Scheduling & Resources -> Finance

Relationship type:

- optional operational fact dependency

Implication:

- session count, make-up sessions, or special scheduling facts may influence
  charges or teacher payout

Boundary rule:

- Finance may use scheduling facts
- Finance does not own the scheduling calendar

## 6.7 Finance -> Reporting & Control

Relationship type:

- upstream reporting feed

Implication:

- dashboards and management reporting should consume finance outputs rather than
  recalculate business truth independently

## 7. Cross-Context Lifecycle Examples

## 7.1 Foreign-language intake flow

`Admissions`
lead -> consultation -> placement -> recommendation

`Academic Delivery`
converted learner -> enrollment -> class participation

`Finance`
financial terms -> billing -> payment -> invoice

## 7.2 Teacher-led extra-study flow

`Admissions`
teacher-sourced learner intake

`Academic Delivery`
program -> class -> enrollment

`Scheduling & Resources`
room/time assignment

`Finance`
learner billing + teacher settlement + expense impact

## 7.3 Transfer and skip-level flow

`Academic Delivery`
class transfer or progression change

`Finance`
adjust learner terms, receivables, carry-forward, or refund logic

`Reporting & Control`
reflect updated operational and financial outcomes

## 8. Anti-Corruption Rules

To prevent boundary erosion, the following rules should apply:

1. `Person` identity must come from `Identity & Organization Core`.
2. `Enrollment` truth must come from `Academic Delivery`.
3. `Financial terms`, `payments`, and `invoices` must come from `Finance`.
4. `Room` and `schedule` truth must come from `Scheduling & Resources`.
5. `Reporting & Control` may aggregate but must not silently replace source data.

## 9. Future Extension Boundaries

Future domains such as `Study Abroad` and `Labor Export` should:

- reuse `Identity & Organization Core`
- potentially consume `Reporting & Control`
- maintain their own workflow truth
- integrate with `Finance` through dedicated service-domain financial terms

They should not reuse Academic Delivery as their workflow backbone.

## 10. Architectural Conclusion

The Academic platform should be implemented as a collaboration of distinct
contexts, not a single giant education module.

The most important context boundaries in v1 are:

1. `Admissions` stops where active study participation begins.
2. `Academic Delivery` owns learner participation, but not money movement.
3. `Scheduling & Resources` owns operational feasibility, but not academic truth.
4. `Finance` owns money truth, invoice readiness, teacher settlement, and costs.
5. `Reporting & Control` is downstream and must remain read-oriented.

This context map is the basis for the next documents:

- core business objects catalog
- core workflow catalog
- module boundary design
- domain model and schema design
