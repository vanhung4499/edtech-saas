# Project Brief for AI Agents

## Product

This product is a SaaS platform for operating private education centers in Vietnam.

It is focused on center operations, not LMS-heavy learning delivery.

## Phase 1 Scope

Build the first serious center-management product:

- tenant, branch, user, role, permission, data scope
- CRM/admissions basics
- programs, classes, enrollments
- room and schedule management
- learner billing and payment tracking
- invoice records
- teacher settlement baseline
- operating expenses and payables
- operational and finance reporting

## Explicitly Out of Scope for Phase 1

- full study-abroad workflow
- labor-export workflow
- parent/mobile portal
- full LMS/homework/testing system
- full accounting ledger
- microservices
- marketplace/plugin architecture

## Important Business Truths

- `Person` is the shared human identity.
- `Student`, `Teacher`, `Guardian`, and `Staff` are roles or participations, not separate identity silos.
- `Program` is an offering family.
- `Class` is the operational teaching unit.
- `Enrollment` is academic participation.
- `EnrollmentFinancialTerms` is the learner-specific financial commitment.
- `Payment` is not `Invoice`.
- `TeacherAssignment` is not `TeacherCommercialTerms`.
- `Finance` is a shared money module that must later support other product modules.

## Differentiation

The product should support real Vietnam operating models:

- center-led classes
- teacher-led classes where teachers bring learners to the center
- teacher revenue-share settlement
- practical tuition collection and debt tracking
- future bridge from center management into study abroad or labor export
