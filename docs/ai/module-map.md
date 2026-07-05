# Module Map for AI Agents

## Module Types

Light modules use:

```txt
controller -> service -> repository
```

Heavy modules use:

```txt
interfaces -> application -> domain -> infrastructure
```

## Light Modules

Use simple 3-layer implementation unless logic grows.

- `system` subfeatures
- `admissions` v1
- `reporting`
- `document`
- `notification`
- configuration dictionaries

Light modules may use Drizzle row objects in services.

## Heavy Modules

Use selective domain modeling.

- `academic`
- `scheduling`
- `finance`

In these modules:

- Drizzle rows should not become domain entities.
- Business rules should move into domain objects, policies, or calculators.
- Application layer owns transaction orchestration.

## Ownership Rules

- `system` owns tenant, branch, user, role, permission, data scope, person.
- `admissions` owns lead, prospect, consultation, placement, promotion intent.
- `academic` owns program, class, enrollment, transfer, hold, teacher assignment.
- `scheduling` owns room, schedule, session calendar, availability, conflicts.
- `finance` owns financial terms, receivable, payment, invoice, expense, payable, settlement.
- `reporting` owns read models and dashboards only.

## Boundary Rules

- Do not write another module's tables directly.
- Do not put finance fields into enrollment.
- Do not put teacher commercial terms into teacher assignment.
- Do not use reporting as a hidden source of truth.
