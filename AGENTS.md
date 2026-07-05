# AGENTS.md

This repository is an AI-assisted product build for a Vietnam-focused EdTech SaaS.

Before coding, read:

1. `docs/ai/project-brief.md`
2. `docs/technical/README.md`
3. `docs/technical/03-backend-conventions.md`
4. the target module README if one exists

## Current Stack

- Frontend: `Next.js`, `React`, `TypeScript`
- Backend: `NestJS`, `TypeScript`
- Database: `PostgreSQL`
- Persistence: `Drizzle ORM`
- Architecture: modular monolith

## Current Product Scope

Phase 1 is center management only:

- admissions basics
- academic delivery
- scheduling and resources
- finance
- reporting basics
- system/platform foundation

Do not implement study-abroad or labor-export workflows yet.

## Backend Rules

- Light modules use `controller -> service -> repository`.
- Heavy modules use `interfaces -> application -> domain -> infrastructure`.
- Heavy modules are `academic`, `scheduling`, and `finance`.
- Drizzle table/row objects are persistence records, not domain entities.
- Light modules may use Drizzle rows in services when logic is simple.
- Heavy modules should map rows into domain objects, policies, or calculators when business rules matter.
- Keep finance separate from academic participation.
- Keep enrollment separate from financial terms.
- Keep payment separate from invoice.

## Frontend Rules

- Build an internal SaaS operator console, not a marketing site.
- Use module-based screens: `system`, `admissions`, `academic`, `scheduling`, `finance`, `reporting`.
- Prefer tables, filters, drawers, tabs, status badges, and structured forms.
- Use the shared UI/design rules in `docs/ai/frontend-rules.md`.

## Verification

Before saying work is complete:

- run the most relevant typecheck/lint/test command available
- mention commands that could not be run
- mention any unverified risk

When no app scripts exist yet, verify by reading the changed docs/files back.
