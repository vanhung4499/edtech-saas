# Scheduling and Resources

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Status     | Active                                                                |
| Date       | 2026-07-06                                                            |
| Scope      | Rooms, recurring schedules, sessions, conflicts, makeup, substitutes  |
| Depends on | `14-academic.md`, `10-cross-cutting-conventions.md`, `02-module-boundaries.md` |

## 1. Purpose and Scope

`scheduling` owns whether academic delivery can run in real time and space: when
a class runs, where, and whether it is operationally feasible. It is a heavy
module.

The **session occurrence** is the convergence point of the whole system:
attendance (academic), actual teacher (finance settlement), room usage, and
arrears billing basis all hang off it. Get the session model right and the rest
follows.

Scope is the two on-site models; both need real rooms, recurring schedules, and
sessions. Non-ONSITE venues are out of scope (`delivery_mode` discriminator
exists in academic; scheduling implements ONSITE only).

## 2. How the Two Models Differ in Scheduling

Same session model; the difference is **bounded vs continuous generation**,
driven by `class_type`:

| | Language (COHORT) | Extra-study (ROLLING) |
| --- | --- | --- |
| Recurring schedule | bounded: start (khai giảng) → end | open-ended |
| Session generation | all sessions up front (bounded) | pre-generated to a horizon, extended occasionally |
| Room | allocated for the slot | allocated for the slot (or per-session) |
| Teacher | center teacher assigned | teacher-led (teacher owns the slot) |
| Makeup | formal (same-level class / makeup session) | possible, lighter |
| End | cohort completes | none (continuous) |

## 3. Recurring Schedule → Session Generation

- A **recurring schedule** is a wall-clock pattern (day-of-week + `time` +
  effective range), stored per `10-cross-cutting-conventions.md` §5 — **not**
  UTC instants. Tenant timezone (`Asia/Ho_Chi_Minh`) applies. Example:
  `Mon/Wed/Fri 18:00–19:30`.
- **Session generation** materializes the pattern into concrete dated
  **sessions** (timestamptz instants), skipping only *known-calendar* holidays
  (§9). Sessions are **pre-generated to a horizon**, not produced lazily:
  - COHORT: generate the full bounded set from khai giảng to end.
  - ROLLING: generate to a configurable horizon (end of the school year, or N
    months ahead). Since there is no end, extension is an **occasional**
    operation — an explicit "extend schedule" action or a low-frequency job —
    **not** a constant rolling window. At this scale (tens of classes) a full
    year of sessions is trivial, and pre-generation matches how centers pre-plan
    fixed slots.
- **Regeneration on schedule change affects only future, not-yet-occurred
  sessions.** Sessions that already occurred or carry attendance are immutable
  (mirror of the billing immutability principle). A schedule edit reschedules
  future sessions; it never rewrites history.

## 4. Session Occurrence

A `Session` is a concrete dated class meeting with planned and actual facts:

```txt
Session
  class_id, planned_start, planned_end, planned_room, planned_teacher
  status:  PLANNED | HELD | RESCHEDULED | CANCELLED
  actual_teacher   (may differ → substitute, §8)
  actual_room      (may differ → per-session override)
  is_makeup        (§7)
```

Rules:

1. Attendance (academic) is recorded **against a session**; the session must
   exist first (the phase 2/3 sequencing note, `14-academic.md` §11).
2. Only sessions that reach `HELD` count for arrears billing and settlement.
   `CANCELLED` sessions do not bill and do not pay a teacher.
3. `actual_teacher` (not the assignment) is what feeds settlement — the teacher
   who actually taught, including a substitute.

## 5. Rooms and Capacity

- **Room**: a physical teaching space at a branch, with a capacity.
- **Allocation** is at the recurring-schedule level by default (the class holds
  a room for its slot), with a **per-session override** (one session in a
  different room). This serves both fixed (language) and fluid (extra-study)
  room use.
- **Effective capacity** = min(academic pedagogical cap, room capacity)
  (`14-academic.md` §8). Academic owns the pedagogical cap; scheduling owns the
  room cap.

## 6. Conflict Detection (advisory)

Scheduling is **class-centric**: a class holds a fixed slot + room + assigned
teacher, pre-planned. It is not a teacher-availability-driven assignment engine —
there is no "recruit students, assign a teacher later" flow. So conflict
detection is **advisory**: it surfaces problems for a human to resolve flexibly,
and does **not** gatekeep. Real operations reconcile overlaps in practice (move a
room, split a group).

| Conflict | Handling |
| --- | --- |
| Room overlap (same room, overlapping sessions) | **warning**, surfaced most prominently (physical clash) |
| Capacity exceeded (roster or room cap) | **warning** |
| Teacher overlap (same teacher, overlapping sessions) | **optional warning**, off by default (schedule follows class, not teacher) |

Overlap is computed on materialized session instants (timezone-correct). All are
overridable by an authorized user with a recorded reason (audited); none
hard-block. A tenant may later opt to harden room overlap into a block; the
default is advisory.

## 7. Reschedule, Cancel, and Makeup

Cancelling and rescheduling are **normal, frequent operations**, not edge cases —
a teacher falls sick, a holiday lands on a session, a branch closes for a day.
The model makes them cheap.

- **Reschedule**: move a session's time/room → `RESCHEDULED`, re-run advisory
  conflict checks. Audited event.
- **Cancel**: a session will not run → `CANCELLED` (holiday, closure, teacher
  unavailable). Does not bill or pay. Supports **bulk cancel by date/scope** — a
  one-day branch closure cancels all that day's sessions in one action.
- **Makeup** — two distinct kinds:
  1. **Class-level**: a cancelled session is compensated by a new/rescheduled
     session for the whole class (this is how a holiday-cancelled session is made
     up). For a COHORT, a makeup may instead shift the cohort end date.
  2. **Learner-level**: an individual with a **makeup entitlement** (from
     academic, `14-academic.md` §6) is placed into a session — another same-level
     class's session or a dedicated makeup session. Attendance is recorded there
     with outcome `MAKEUP`. Scheduling places the learner; the entitlement (right)
     stays academic.

## 8. Substitute Teacher (dạy thay)

When the assigned teacher cannot teach a specific session, `actual_teacher` on
the session records who actually taught. This is a session-level fact — no change
to the academic teacher assignment. Settlement (finance) pays based on
`actual_teacher` of `HELD` sessions, so substitution flows to payout correctly.

## 9. Holidays and Closures

Vietnamese holidays are **not all pre-knowable**: solar holidays are fixed, but
Tết and lunar holidays shift year to year and their exact days off are announced
annually, and ad-hoc closures happen. So do **not** try to pre-model every
holiday at generation time.

Approach — **generate optimistically, adjust reactively**:

1. A tenant/branch **holiday/closure calendar** holds *known* dates (fixed solar
   holidays; Tết once announced). Generation skips these — a cheap win for the
   predictable ones.
2. Everything else — a lunar holiday not yet in the calendar, a late-announced
   day off, a weather closure, a sick teacher — is handled **after the fact** by
   cancelling the affected sessions and arranging makeup (§7). This is normal
   operation, not an exception.
3. Adding a date to the calendar *after* sessions were generated **surfaces** the
   now-conflicting sessions for **bulk cancel + makeup** — it never silently
   deletes them (they may already carry attendance).

Do not over-engineer holiday handling: it does not always happen, and cancel +
makeup already covers it. **Tết** is the one bulk case worth smooth tooling —
bulk-cancel its announced range, then makeup or shift cohort ends.

## 10. Teacher Availability

**Not modeled in phase 1.** Scheduling is class-centric with pre-planned fixed
slots; there is no teacher-availability calendar and no dynamic "assign a teacher
to a pool of classes" flow. A teacher is simply assigned to a class (academic);
teacher-overlap detection is an optional advisory (§6), not an availability
engine. A preference/availability calendar can be added later only if an
auto-scheduling need appears.

## 11. Module Seams

```txt
academic ──► scheduling : class needs scheduling; teacher assignment;
                          makeup entitlement (place the learner)
scheduling ──► academic : Session occurrence facts (so attendance can be recorded)
scheduling ──► finance  : HELD sessions + actual_teacher (settlement);
                          sessions run → attendance → arrears billing basis
```

Scheduling never writes academic/finance tables; it publishes session events
(`SessionHeld`, `SessionCancelled`, `SessionRescheduled`) consumed downstream
(`10-cross-cutting-conventions.md` §2). The attendance record itself is academic,
recorded against a scheduling session id.

## 12. Domain Modeling (heavy module)

- `domain/`: `ScheduleConflictPolicy` (room/teacher overlap, capacity),
  `SessionGenerator` (pattern → instants, holiday-aware, bounded vs horizon) —
  pure, timezone-correct, no Drizzle, no transactions.
- `application/`: use cases (allocate schedule, generate/extend sessions,
  reschedule, cancel, place makeup, assign substitute), transaction boundary,
  events.
- `infrastructure/`: repositories; tables in
  `packages/database/src/schema/scheduling.ts`.

## 13. Testing Requirements

- Session generation: COHORT produces the bounded set; ROLLING pre-generates to a
  horizon and extends on demand; known-calendar holidays are skipped;
  regeneration leaves occurred/attended sessions untouched.
- Closures: bulk cancel by date cancels affected sessions (no bill/pay) and pairs
  with class-level makeup; adding a holiday after generation surfaces (not
  deletes) the affected sessions.
- Conflict: overlaps surface as overridable warnings (with reason), never a hard
  block; timezone-correct overlap computation.
- Reschedule/cancel: state transitions + events; cancelled session does not bill
  or pay.
- Makeup: class-level compensation; learner-level placement records `MAKEUP`
  attendance against the target session.
- Substitute: `actual_teacher` drives settlement, assignment unchanged.

## 14. Phase-1 Scope

Build:

- Room + capacity; recurring schedule (wall-clock) + session generation
  (pre-generated to a horizon; occasional extension for rolling)
- holiday/closure calendar for known dates (generation skips them);
  generate-then-cancel-and-makeup for unpredictable/late holidays
- Session occurrence (PLANNED/HELD/RESCHEDULED/CANCELLED, actual teacher/room)
- advisory conflict detection (room + capacity warning; optional teacher warning)
- reschedule, cancel (incl. bulk cancel by date), class- + learner-level makeup,
  substitute teacher
- session events to academic (attendance) and finance (billing/settlement)

Defer:

- teacher availability/preference calendar, auto-scheduling/optimization
- non-ONSITE venues, resources beyond rooms (equipment), room-booking outside
  class sessions
