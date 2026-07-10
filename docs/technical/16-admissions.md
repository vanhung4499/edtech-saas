# Admissions (CRM / Tuyển sinh)

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Status     | Active                                                                |
| Date       | 2026-07-06                                                            |
| Scope      | Pre-enrollment funnel: lead → conversion. Light module.               |
| Depends on | `14-academic.md`, `02-module-boundaries.md`, `10-cross-cutting-conventions.md` |

## 1. Purpose and Scope

`admissions` manages the journey **before** a person becomes an active learner:
who is interested, where they came from, who is handling them, and whether they
convert into an enrollment.

It is deliberately **light** and deliberately **optional**. Enrollment can be
created directly without any admissions record (`14-academic.md` §5) — admissions
is upstream feed, not a gate. It is a market baseline ("CRM/tuyển sinh"), not a
differentiator, so build it lean and let it grow.

Two-model reality:

- **Language (center-led):** the funnel matters — inquiry → consult → placement →
  offer → convert. This is the growth engine.
- **Extra-study (teacher-led):** near-skipped — the teacher already brought the
  learners. Capture `source = teacher-sourced` and bulk-enroll directly; no
  nurturing, no placement.

## 2. Module Shape

**Light** (`controller → service → repository`, `03-backend-conventions.md`).
No domain layer. Services may use Drizzle rows directly — this is CRUD + pipeline
state, not lifecycle-heavy domain logic.

## 3. Core Model

Kept minimal. `Prospect` is a **stage of a lead, not a separate table** — the
light simplification of the business catalog's Lead/Prospect distinction.

```txt
Lead
  person_id?        (null until identity is created/matched)
  contact           name, phone, email (before a Person exists)
  source_channel    walk-in | referral | teacher-sourced | facebook | website | ...
  stage             NEW → CONTACTED → QUALIFIED → CONSULTING → OFFER → CONVERTED / LOST
  owner_user_id     staff handling it
  interest          program/level of interest, target branch

Consultation   (0..n per lead)   advisor, notes, outcome
Placement      (0..1 per lead)   assessment result → recommended level  (language)
PromotionOffer (0..n per lead)   ref to a finance promotion, offered terms
```

`SourceChannel` is tenant reference data (dictionary), for source-ROI reporting.

## 4. Lead Lifecycle

A simple CRM funnel — a `stage` enum, not a heavy state machine:

```txt
NEW → CONTACTED → QUALIFIED(=prospect) → CONSULTING → OFFER → CONVERTED
                                                            └→ LOST (any stage)
```

- Stage changes are audited but light (no cross-module ripple like enrollment).
- Follow-ups (call back, book consultation) are **tasks** (reserved `tasks`
  module) assigned to the owner; due tasks feed **notification** (Zalo/SMS).
- `LOST` captures a reason for funnel-drop reporting.

## 5. Placement (xếp lớp) — language only

An optional `Placement` record: assessment result → **recommended level**. It is
advisory input into which class to enroll (Rule E3) — it does not create an
enrollment and does not own class state. Extra-study skips it entirely.

## 6. Promotion Offer

A light record linking a lead to a **finance-owned promotion** (`11-billing.md`).
Admissions can *offer* it; finance owns the money effect. On conversion the
offered promotion becomes an adjustment input to the learner's `FinancialTerms`
(Rule F4) — admissions never touches receivables or payments.

## 7. Conversion — the one meaningful action

Converting a lead is the single real piece of logic and the handoff out of
admissions:

1. Create or match a `Person` (identity, system) with dedup (Rule A6).
2. Call `academic` to create the `Enrollment` (funnel path → RESERVED/ACTIVE).
3. Pass any offered promotion to `finance` as a terms adjustment input.
4. Mark the lead `CONVERTED`.

This runs in a transaction at the service boundary; the cross-module calls go
through the target modules' service APIs (never their tables).

## 8. Two-Model Handling

| | Language (center-led) | Extra-study (teacher-led) |
| --- | --- | --- |
| Funnel | full (all stages) | skipped |
| Placement | yes | no |
| Intake | one lead at a time | source captured on enrollment, or bulk-lead import that converts immediately |
| Admissions record | required-ish | optional; often just a `source` on the enrollment |

Teacher-led attribution can live as a `source` field on the enrollment
(academic) with **no lead at all** — admissions is not forced on.

## 9. Seams

- `system` — `Person` identity + dedup on conversion.
- `academic` — conversion creates the enrollment; placement recommends a level.
- `finance` — promotion offer → financial-terms adjustment on conversion.
- `tasks` / `notification` — follow-ups and learner contact.

Admissions writes only its own tables; everything else is a service call.

## 10. Phase Scope (Phase 5)

Build (lean):

- `Lead` + `SourceChannel` + funnel `stage`; owner; interest
- `Consultation` notes; optional `Placement` (recommended level)
- `PromotionOffer` linking a finance promotion
- **Conversion** → person (dedup) + enrollment (academic) + promotion (finance)
- follow-up tasks + source-ROI reporting inputs

Defer:

- lead scoring, marketing automation, campaign management (finance owns campaign
  definition), multi-touch attribution, separate Prospect entity, web lead-capture
  integrations
