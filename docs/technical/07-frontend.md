# Frontend Architecture and Conventions

| Field      | Value                                                          |
| ---------- | -------------------------------------------------------------- |
| Status     | Active                                                         |
| Date       | 2026-07-06                                                     |
| Scope      | Operator console: rendering, data, auth, tables, forms, design |
| Depends on | `03-backend-conventions.md`, `09-auth-and-authorization.md`, `04-tenancy-and-data-scope.md` |

## 1. Product Shape

`apps/web` is an **internal SaaS operator console** — information-dense tables,
filters, drawers, structured forms. Not a marketing site; no hero sections, no
decorative dashboards. Visual/UX patterns (screen anatomy) are in
`docs/ai/frontend-rules.md`; this doc is the technical + design-token contract.

## 2. Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS, **shadcn/ui** + Radix primitives, lucide-react
- TanStack Query (server state), TanStack Table (tables)
- React Hook Form + zod (forms/validation)

Components come from shadcn/ui (copied into the repo, then themed) — we do not
build a component library. The design work is a thin layer on top: tokens (§11),
status vocabulary (§12), and composition patterns (§13).

## 3. Rendering Model (RSC vs client)

The console is an authenticated, interactive, data-heavy app. Decision:

- The app is **client-rendered behind auth**. Server Components render the static
  shell (layout, nav chrome); everything that fetches business data is a **client
  component** using TanStack Query.
- We do **not** use RSC server-side data fetching for business data: data is
  session-scoped, permission-filtered, and frequently refetched — client fetching
  with a cache fits, and it avoids threading the session cookie through RSC.
- No SSR/SEO concerns (internal tool). Prefer a simple, predominantly-client app
  over RSC/streaming complexity.

## 4. Routing and App Structure

```txt
apps/web/src/
  app/
    (auth)/login/…            public routes (no shell)
    (app)/                    authenticated shell layout (sidebar, topbar)
      system/  admissions/  academic/  scheduling/  finance/  reporting/
  modules/<module>/           screens, queries, mutations, forms, schemas
  lib/                        api client, fetch layer, query client, auth
  components/                 app-level composed components (DataTable, Form…)
```

- The `(app)` route group wraps everything in the authenticated shell; the
  `(auth)` group is public.
- Frontend modules mirror product modules. Each module owns its screens, queries,
  and forms. Shared primitives live in `@edtech/ui`; app-level composed
  components (DataTable, PageHeader) in `components/`.

## 5. API Consumption

```txt
NestJS DTOs -> /api/openapi.json -> generated TypeScript client/types -> web
```

1. Generate client/types from `/api/openapi.json` into a dedicated generated
   directory; **never edit generated code**. If a type is missing, fix the
   DTO/Swagger on the API and regenerate. No hand-written API interfaces.
2. A **shared fetch layer** wraps the client: sends cookies (`credentials:
   "include"`), unwraps the result envelope (`{ code, message, data, traceId }`)
   to `data`, throws a typed error carrying `code`/`message`/`traceId` on failure.
3. Backend domain objects never become UI models — generated response types are
   the boundary.
4. The client never sends a tenant id; tenant rides the session
   (`04-tenancy-and-data-scope.md`).

## 6. Auth on the Frontend

- Session is an httpOnly cookie (`09-auth-and-authorization.md`); the client just
  sends it. It never reads or stores the session.
- An **auth provider** boots the app from a single `GET /auth/me` →
  `{ user, tenant, branchScope, permissions[] }`, held in context.
- The `(app)` layout is a **protected boundary**: no session / `401` → redirect
  to login. `403` → a permission toast (the API is the enforcement, §10).
- On any request returning `401`, the fetch layer clears auth state and redirects.

## 7. Data Fetching (TanStack Query)

1. Server state lives in Query — never copy API data into local stores.
2. Query keys are namespaced by module and include filters:
   `["finance", "receivables", { branchId, status, page }]`.
3. Mutations invalidate the queries they affect. **Optimistic updates only for
   low-risk UI**, never for money-changing actions — those reflect server truth.
4. Sensible `staleTime` for reference data (dictionaries, branches); short for
   operational lists. A single `QueryClient` in `lib/`.

## 8. Data Tables

The console is table-first. A single `DataTable` abstraction over TanStack Table:

- **URL-driven** state — pagination, sort, filters live in the URL query string
  (shareable, back-button-correct, two-tabs-safe), read into the query key.
- **Server-side** pagination/sort/filter for operational lists (the API paginates
  via the common page DTO); client-side only for small reference lists.
- Standard column kit: text, **money right-aligned** (§14), **status badge**
  (§12), date, row actions (open drawer), optional bulk-select.
- Row click opens a **detail drawer**; deep detail is a route.

## 9. Forms

- React Hook Form + a **zod schema per form**. Client zod validation is UX; the
  API's `class-validator` is the enforcement.
- The API's `VALIDATION_ERROR` field list (`{ field, message }`) maps back onto
  form fields via a shared helper.
- Sectioned layout; **sticky action bar** for long forms; **confirm dialog** for
  risky/irreversible/money actions.
- A `Form` helper standardizes submit → mutation → error-mapping → toast.

## 10. Permission and Entitlement Gating

- Menus and actions are gated by the permission keys from `/auth/me`. A
  `usePermission("finance:receivable:write")` hook + a `<Can permission=…>`
  wrapper hide what the user cannot do.
- Disabled modules (tenant entitlement) are hidden entirely.
- Gating is **UX only**; the API enforces every call (`09` §4). Never rely on the
  hidden UI for security.

## 11. Design Tokens (the thin design layer)

shadcn/ui gives components; we decide the theme via its CSS variables in
`globals.css` + Tailwind config:

- **Palette**: a neutral base (slate/zinc) + one restrained **primary** (brand)
  for primary actions and active nav. Semantic intents below drive everything
  status-related — do not scatter ad-hoc colors (frontend-rules).
- **Semantic intents** (the only status colors): `success` (green), `warning`
  (amber), `danger` (red), `info` (blue), `neutral` (slate), `accent` (violet).
- **Density**: operator-console compact — base 14px, table row height ~36px,
  tightened spacing scale. shadcn defaults are a touch airy; tighten once,
  centrally.
- **Radius/elevation**: small radius, minimal shadow (dense, businesslike).
- **Theme**: light-first in phase 1; tokens are structured so dark mode can be
  added later without touching components. Do not build dark mode now.

## 12. Status Color Vocabulary

Every workflow state maps to one **semantic intent** (§11), applied through a
`StatusBadge` — one source of truth, so a state reads the same color everywhere:

| Domain | State → intent |
| --- | --- |
| Enrollment | ACTIVE→success · ON_HOLD→warning · COMPLETED→info · DROPPED→neutral · TRANSFERRED→neutral · TRIAL→accent · RESERVED→neutral |
| Receivable/Payment | PAID→success · PARTIAL→warning · OVERDUE→danger · OPEN→neutral |
| Invoice | DRAFT→neutral · ISSUED→info · REPLACED→warning · CANCELLED→danger |
| Lead | NEW→neutral · CONTACTED→info · QUALIFIED→accent · CONSULTING→warning · OFFER→info · CONVERTED→success · LOST→danger |
| Session | PLANNED→neutral · HELD→success · RESCHEDULED→warning · CANCELLED→danger |

A `StatusBadge` component takes `(domain, state)` and resolves the intent from
this map — never hardcode a color at a call site.

## 13. Composition Patterns

Assembled from shadcn primitives; the recurring skeletons (visual detail in
`frontend-rules.md`):

- **List page**: `PageHeader` (title, primary action) → filter/search toolbar →
  `DataTable` → row actions → detail drawer. Filters in the URL.
- **Detail page/drawer**: summary header + `StatusBadge` → tabs → activity/audit
  timeline when relevant → right-side metadata.
- **Form**: sectioned + sticky action bar + confirm dialog for risky actions.

## 14. Money and Dates

- API money is integer VND (`06-finance.md`); format with
  `Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })`,
  right-aligned in tables. **Never** do money arithmetic on the client beyond
  summing values the API already computed.
- Dates arrive as ISO (timestamptz); format in the tenant timezone at the display
  edge only (`10-cross-cutting-conventions.md` §5).

## 15. Language, Errors, Loading, Empty

- User-facing text maps the API `code` to a **vi-VN dictionary** (`10` §6); never
  render the raw English `message` except as fallback. Unknown code → generic
  message + visible `traceId` for support.
- Standard **skeletons** for loading lists/detail; an **error boundary** shows the
  `traceId`; a consistent **empty state** per list.

## 16. Phase Scope

Set up first (the reusable skeleton, before any screen):

- app shell + `(auth)`/`(app)` routing + auth provider + protected boundary
- OpenAPI client generation + shared fetch layer (envelope, errors, traceId)
- `QueryClient`, `DataTable`, `Form`, `StatusBadge`, `Can` abstractions
- design tokens (palette, intents, density) + status vocabulary + vi-VN dictionary

Defer: dark mode, advanced data-viz/charts, offline, custom report builder UI,
per-module screens (built with their modules).
