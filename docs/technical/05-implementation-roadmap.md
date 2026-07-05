# Implementation Roadmap v2

| Field      | Value                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| Status     | Draft for review                                                                                                          |
| Date       | 2026-07-05                                                                                                                |
| Scope      | Minimal build order for the first production version                                                                      |
| Depends on | `01-system-architecture.md`, `02-module-boundaries.md`, `03-backend-conventions.md`, `04-data-finance-and-integration.md` |

## 1. Purpose

This document defines the build order.

It is intentionally short.

## 2. Build Principle

Build the smallest serious center operating system first.

Do not build study abroad or labor export yet.

Do not build a generic framework before the product breathes.

## 3. Phase 0: Project Foundation

Goal:

- create the TypeScript monorepo foundation
- create the NestJS backend foundation
- create the Next.js frontend foundation
- make local development repeatable

Build:

- pnpm workspace
- backend module structure
- frontend app
- PostgreSQL
- Redis
- Drizzle schema and migrations
- common response/error model
- OpenAPI or shared-contract setup
- basic CI commands

Exit:

- developer can run backend, frontend, database, and migrations locally

## 4. Phase 1: Framework and System

Goal:

- build reusable SaaS platform base

Build:

- tenant
- branch
- user
- role
- permission
- data scope
- menu/config/dictionary if needed
- audit log
- login log
- file metadata

Exit:

- users can log in
- roles and branch/data scope can restrict access
- business modules can depend on `system`

## 5. Phase 2: Academic Center Core

Goal:

- make the center operationally real

Build:

- program
- class
- enrollment
- transfer
- hold/pause
- re-entry
- teacher assignment

Exit:

- center can create classes and enroll learners
- academic participation truth is clear

## 6. Phase 3: Scheduling Core

Goal:

- make classes executable in real rooms and time

Build:

- room
- room capacity
- recurring schedule
- session calendar
- teacher availability
- conflict checks
- reschedule
- make-up session

Exit:

- class schedule and room feasibility are controlled by the system

## 7. Phase 4: Finance Core

Goal:

- make the system commercially usable

Build:

- pricing rule
- enrollment financial terms
- receivable
- payment request
- payment transaction
- payment allocation
- expense
- payable
- teacher commercial terms
- teacher settlement
- invoice records

Exit:

- center can bill, collect, track debt, record expenses, settle teachers, and issue invoice records

## 8. Phase 5: Admissions and CRM Basics

Goal:

- support real intake and conversion

Build:

- lead
- prospect
- source channel
- consultation
- placement assessment
- promotion offer intent
- conversion into enrollment

Exit:

- center can run a simple admissions pipeline into academic and finance

## 9. Phase 6: Reporting and Control

Goal:

- give operators and owners control visibility

Build:

- active learner reports
- class fill reports
- room utilization
- receivable aging
- revenue by branch/program/class
- expense summaries
- teacher settlement summaries

Exit:

- managers can run day-to-day control from the system

## 10. Phase 7: First-Customer Hardening

Goal:

- prepare for real production use

Build:

- audit review
- backup and restore check
- seed/import tools
- permission matrix review
- finance test cases
- invoice/payment edge-case review
- support/debug screens where needed

Exit:

- first customer can run real operations with acceptable support risk

## 11. What To Defer

Defer:

- parent portal
- mobile app
- LMS-heavy teaching features
- study abroad workflow
- labor export workflow
- advanced payment gateway automation
- full accounting ledger
- plugin architecture
- microservices

## 12. First Technical Milestone

The immediate milestone should be:

```txt
Next.js + NestJS monorepo skeleton
system module baseline
PostgreSQL + Drizzle migrations
login + RBAC + data scope
OpenAPI-generated frontend client/types
```

Everything else should build on that.
