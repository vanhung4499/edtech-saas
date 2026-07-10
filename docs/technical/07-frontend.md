# Frontend Technical Conventions

| Field      | Value                                                     |
| ---------- | ---------------------------------------------------------- |
| Status     | Active                                                     |
| Date       | 2026-07-06                                                 |
| Scope      | Operator console architecture and API consumption          |
| Depends on | `01-system-architecture.md`, `03-backend-conventions.md`   |

## 1. Product Shape

`apps/web` is an **internal SaaS operator console** — information-dense tables,
filters, drawers, structured forms. Not a marketing site; no hero sections, no
decorative dashboards.

UI patterns (layout, screen anatomy, component choices) are specified in
`docs/ai/frontend-rules.md`. This doc covers the technical contract.

## 2. Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS, shadcn/ui + Radix primitives, lucide-react
- TanStack Query (server state), TanStack Table (tables)
- React Hook Form + zod (forms/validation)

## 3. API Consumption

The API contract flows one way:

```txt
NestJS DTOs -> /api/openapi.json -> generated TypeScript client/types -> web
```

Rules:

1. Generate the client/types from the running API's `/api/openapi.json` into a
   dedicated generated directory. Generated code is never edited by hand.
2. No hand-written request/response interfaces for API data. If a type is
   missing, fix the DTO/Swagger decorators on the API side and regenerate.
3. Backend domain objects never become UI models. The generated response types
   are the boundary.
4. Every response arrives in the result envelope
   (`{ code, message, data, traceId }`); the shared fetch layer unwraps `data`,
   surfaces `code`/`message` for error toasts, and keeps `traceId` visible for
   support.
5. Auth/tenant context rides on the session; the client never sends a tenant id
   explicitly (`04-tenancy-and-data-scope.md`).

## 4. Module Structure

Frontend modules mirror product modules:

```txt
apps/web/src/modules/
  system/  admissions/  academic/  scheduling/  finance/  reporting/
```

Each module owns its screens, queries, and forms. Shared primitives live in
`@edtech/ui`; module-specific components stay in the module.

## 5. State Rules

1. Server state lives in TanStack Query — no copying API data into local stores.
2. Query keys are namespaced by module: `["finance", "receivables", filters]`.
3. Mutations invalidate the queries they affect; optimistic updates only for
   low-risk interactions, never for money-changing actions.
4. Forms: React Hook Form + zod schema per form. Client-side zod validation is a
   UX convenience — the API's `class-validator` remains the enforcement layer,
   and `VALIDATION_ERROR` field errors from the API map back onto form fields.
5. No business/domain logic in UI state. Status transitions, money math, and
   permissions come from the API.
6. The working-branch switcher is client state (URL param + remembered default),
   sent explicitly as a filter/field on each request — never a server-side
   "current branch" (`09-auth-and-authorization.md` section 4.6). Two tabs on
   two branches must work.

## 6. Money and Formatting

- API money values are integer VND (`06-finance.md`). Format for display with
  `Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })`.
- Never do money arithmetic in the frontend beyond display-level sums of values
  the API already computed.
- Dates arrive as ISO strings (timestamptz); format in the user's locale at the
  display edge only.
