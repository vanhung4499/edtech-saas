# Academic Delivery

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Status     | Active                                                                |
| Date       | 2026-07-06                                                            |
| Scope      | Program/class model, enrollment lifecycle, attendance, for two models |
| Depends on | `02-module-boundaries.md`, `11-billing.md`, `docs/business/academic-business-rules.md` |

## 1. Purpose and Scope

`academic` is the source of truth for **who is studying what**. It is a heavy
module (`interfaces → application → domain → infrastructure`).

Phase-1 serves exactly two on-site center models, and the design is validated by
being able to express both with the same core, differentiated only by
configuration:

- **Language (dạy tiếng)** — cohort-based, level ladder, full admissions funnel,
  billed in advance. E.g. TOPIK, HSK, IELTS.
- **Extra-study (dạy thêm)** — rolling/continuous, teacher-led, direct bulk
  enrollment, billed in arrears. E.g. "Toán thầy Dũng".

Do not model other education models (universities, K-12, MOOC, corporate). New
operating models are added later as new flag values + strategies, never by
abstracting the core now (`docs/technical/README.md` principle).

## 2. Catalog: Program → (Level) → Class

```txt
Program            offering family (TOPIK, "Toán 6")
  └─ ProgramLevel  OPTIONAL catalog: (program, level_code, rank, entry_req, price_ref)
       └─ Class    the concrete cohort learners actually study in
```

- **Program** = offering family. **Class** = the concrete operational cohort
  (`TOPIK 1 - Tối 246 - KG 15/3`). One level runs as many classes.
- **ProgramLevel** is an OPTIONAL reference catalog for programs with a fixed
  ladder (TOPIK 1–6): it defines level config once (rank, entry requirement,
  price reference) so classes and `PricingRule` reference it instead of
  repeating. Extra-study with free-form sections (`6-1`, `6-2`) skips it —
  `Class.level_code` is then a free string or unused. This is reference data,
  **not** a workflow "Stage" entity.
- `Class.level_code` + `progression_rank` live on the class; skip-level is
  allowed (placement can enter at any rank).
- `PricingRule` (finance) attaches to `(program, level_code)`, not per class.

## 3. Class Configuration Axes

The two models are the **same class structure with different flags** — no
separate types, no per-model tables:

| Axis | Values | Language | Extra-study |
| --- | --- | --- | --- |
| `delivery_mode` | `ONSITE` (now) / online… later | ONSITE | ONSITE |
| `class_type` | `COHORT` / `ROLLING` | COHORT | ROLLING |
| `sourcing` | `CENTER_LED` / `TEACHER_LED` | usually CENTER_LED | usually TEACHER_LED |
| `absence_makeup_policy` | `MAKEUP_ALLOWED` / `FORFEIT` | often MAKEUP | often FORFEIT |
| billing timing (finance) | `ADVANCE` / `ARREARS` | ADVANCE | ARREARS |
| teacher pay (finance) | fixed / per-session / revenue-share | fixed/per-session | revenue-share |

`sourcing` is orthogonal to `delivery_mode`: a teacher-led class is still
on-site (the teacher brings learners who study **at** the center).

## 4. Enrollment and Its Lifecycle

`Enrollment` is the per-learner academic participation record, separate from
`FinancialTerms` (finance) — Rule E5. It references a `Person` id (system) and a
class; the "student" is not a separate entity.

State machine (optional states in parentheses apply to the funnel path only):

```txt
(TRIAL) ─┐
(RESERVED) ─┼─► ACTIVE ─┬─► ON_HOLD ─► ACTIVE (resume, same enrollment)
           │            │        └─► DROPPED (expiry/manual)
           │            ├─► COMPLETED   (terminal)
           │            ├─► DROPPED      (terminal)
           │            └─► TRANSFERRED  (terminal; new enrollment in target)
```

- `TRIAL` (học thử): on the roster, attendance recorded, billed `TRIAL_FREE`
  (not charged). Converts to `ACTIVE` on real enrollment. **Funnel only.**
- `RESERVED`: enrolled before the cohort's khai giảng. **Cohort/funnel only.**
- Extra-study/rolling enrollments are created **directly as `ACTIVE`** — they
  skip `TRIAL`/`RESERVED`.
- Every transition carries an **effective date**, reason, actor; it is a business
  event (audited, `10-cross-cutting-conventions.md` §3) and publishes a domain
  event for finance/scheduling — never a silent field edit (Rule D4).
- **Re-entry after `DROPPED` = a new enrollment** (clean history). **Resume from
  `ON_HOLD` = back to `ACTIVE`** on the same enrollment.

## 5. Onboarding Paths (optional pipeline, not one funnel)

Enrollment is creatable **directly, without a preceding admissions record**.
Admissions is an OPTIONAL upstream. This is a first-class path, not a bypass.

| | Language (full funnel) | Extra-study (direct/bulk) |
| --- | --- | --- |
| Flow | lead → consult → test → placement → recommend level → enroll (`RESERVED`→`ACTIVE`) | create class → **bulk add** Person + Enrollment (`ACTIVE`) |
| Admissions | used | skipped (source = teacher-sourced) |
| Placement/test | yes | no |

- **Bulk enrollment is a first-class operation**: paste/import a roster → create
  or match `Person` records + create enrollments in one batch for dozens of
  learners. Person dedup (assist-and-merge, Rule A6) runs on import to avoid
  duplicate learners.
- `academic` does not depend on `admissions`; it consumes an admissions
  conversion when present.

## 6. Attendance and Makeup

`academic` owns learner presence; `scheduling` owns the session it happened in
(session occurrence). Attendance cannot be recorded before the session exists —
see the sequencing note in §11.

Attendance outcome (aligned with finance billability, `11-billing.md` §6):

```txt
PRESENT | ABSENT | EXCUSED | MAKEUP | TRIAL_FREE
```

Two **independent per-class policies**, owned by different modules — do not
conflate:

| Policy | Owner | Values | Meaning |
| --- | --- | --- | --- |
| `absence_makeup_policy` | academic | `MAKEUP_ALLOWED` / `FORFEIT` | does an excused absence grant a makeup, or is it lost |
| billability | finance | `CHARGE` / `NO_CHARGE` | is the missed session charged |

"Vắng coi như mất" is a first-class combination, e.g. monthly-flat extra-study =
`FORFEIT` + `CHARGE` (lost the session and still pay); per-session extra-study =
`FORFEIT` + `NO_CHARGE`; language full-course = `MAKEUP_ALLOWED` (preserve
prepaid value).

When policy = `MAKEUP_ALLOWED`, an excused absence creates a **makeup
entitlement** (academic). `scheduling` places the actual makeup — into another
same-level class or a dedicated makeup session. The entitlement (right) is
academic; the session (place/time) is scheduling.

## 7. Transfer, Hold, Progression

These are distinct business events with cross-module ripples; academic owns the
event and emits it, finance/scheduling react.

- **Transfer** (lateral, mid-course): learner moves class → this enrollment
  `TRANSFERRED` + a new enrollment in the target (same or cross program).
  Effective date drives finance proration and scheduling roster move.
- **Progression** (level-up on completion): `COMPLETED` + a **new enrollment**
  in the next-level class. Not a transfer. Optionally surfaced as a
  next-level-recommendation **task**.
- **Hold** (bảo lưu): `ACTIVE → ON_HOLD` with an **expected return / expiry**;
  suspends future billing (finance); seat-reservation is a configurable policy;
  expiry with no resume auto-transitions to `DROPPED` (with a task/notification).
- **Skip-level**: entering above a rank must not charge skipped participation
  (Rule F3) — no receivables for classes never attended.

## 8. Capacity, Roster, Waitlist

- **Roster** = the set of non-terminal enrollments in a class.
- **Capacity**: academic **pedagogical cap** on the class (teaching-quality /
  revenue-share headcount input), separate from the scheduling **room capacity**.
  Effective cap = min of the two when scheduled.
- **Waitlist**: a light list when a class is at cap; automation (auto-promote on
  a free seat) is deferred past phase 1.

## 9. Teacher Assignment

- Academic fact: which teacher(s) teach a class, role, effective period —
  separate from `TeacherCommercialTerms` (finance, Rule D6).
- Phase 1: one **primary teacher** per class. Substitution is handled at the
  scheduling session level (actual teacher per session). Co-teaching is deferred.
- Assignment feeds `scheduling` (availability/conflict) and `finance`
  (settlement from sessions actually taught) via query/event, not shared tables.

## 10. Module Seams (what academic emits)

Academic is upstream of scheduling and finance. It publishes post-commit domain
events (`10-cross-cutting-conventions.md` §2); consumers react:

| Event | Consumers |
| --- | --- |
| `EnrollmentCreated` / `EnrollmentActivated` | finance (terms, receivables), reporting |
| `EnrollmentTransferred` / `EnrollmentHeld` / `EnrollmentResumed` | finance (proration/suspension), scheduling (roster) |
| `EnrollmentCompleted` / `EnrollmentDropped` | finance (final billing), reporting, tasks |
| `AttendanceRecorded` | finance (arrears billing input), reporting |
| `MakeupEntitlementCreated` | scheduling (place makeup) |

Academic never writes finance/scheduling tables; the charge basis for a learner
is `("academic", "enrollment", <id>)` (`06-finance.md` §5).

## 11. Domain Modeling and Sequencing

Heavy-module placement (`03-backend-conventions.md`):

- `domain/`: `EnrollmentLifecyclePolicy` (legal transitions), `MakeupPolicy`,
  roster/capacity rules — pure, no Drizzle, no transactions.
- `application/`: use cases (enroll, bulk-enroll, transfer, hold, resume,
  complete), transaction boundary via `Database.run`, audit + event publication.
- `infrastructure/`: repositories, mappers; tables in
  `apps/api/src/database/schema/academic.ts`.

**Sequencing note:** attendance and makeup need `scheduling` sessions
(phase 3) but academic is phase 2. Phase 2 builds catalog + class + enrollment
lifecycle + roster; **attendance/makeup land at the phase 2/3 boundary** once a
minimal session calendar exists. Build enrollment first; attendance follows
sessions.

## 12. Testing Requirements

- Lifecycle: only legal transitions allowed; illegal ones throw; effective dates
  and events emitted per transition.
- Two-model coverage: a language cohort (funnel, RESERVED→ACTIVE, advance) and an
  extra-study rolling class (direct bulk ACTIVE, arrears) both work on the same
  core.
- Bulk enroll: N persons created/matched (dedup) + enrollments in one batch.
- Makeup policy: `FORFEIT` grants no entitlement; `MAKEUP_ALLOWED` creates one;
  independent of finance billability.
- Transfer vs progression: transfer terminates + creates target enrollment;
  progression completes + creates next-level enrollment (distinct paths).
- Hold: billing suspension event emitted; expiry auto-drops.

## 13. Phase-1 Scope

Build:

- `Program`, `ProgramLevel` (optional catalog), `Class` with the config axes
- `Enrollment` + lifecycle (with optional TRIAL/RESERVED), effective dating,
  audited transitions + events
- both onboarding paths incl. **bulk enrollment** with person dedup
- attendance outcomes + `absence_makeup_policy` + makeup entitlement (session
  placement is scheduling)
- transfer / hold / resume / completion / progression as events
- primary teacher assignment; pedagogical capacity + roster; light waitlist

Defer:

- non-ONSITE delivery modes, co-teaching, waitlist automation, certificate
  issuance beyond a completion record, curriculum/content (LMS module)
