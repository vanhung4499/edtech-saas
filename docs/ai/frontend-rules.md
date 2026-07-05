# Frontend Rules for AI Agents

## Product Style

Build an internal SaaS operator console.

Do not build:

- marketing landing pages
- hero sections
- decorative dashboards
- card-heavy layouts with low information density

## Stack

- `Next.js`
- `React`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`
- `Radix primitives`
- `lucide-react`
- `TanStack Query`
- `TanStack Table`
- `React Hook Form`
- `Zod`

## Layout Pattern

Use this as the default app shape:

```txt
AppShell
  Sidebar
  Topbar
  PageHeader
  Toolbar
  Content
  Drawer / Detail panel
```

## Screen Patterns

List pages should use:

- page header
- filter/search toolbar
- data table
- row actions
- detail drawer
- bulk actions when useful

Detail pages should use:

- summary header
- status badge
- tabs
- audit/activity timeline when relevant
- right-side metadata panel when useful

Forms should use:

- sectioned layout
- validation messages
- sticky action bar for long forms
- confirmation dialog for risky actions

## UI Rules

- Use shadcn/ui components first.
- Use lucide icons for icon buttons.
- Use semantic status badges for workflow state.
- Use tables for operational data.
- Use drawers for quick inspect/edit flows.
- Use dialogs only for focused actions.
- Do not invent new colors per screen.
- Do not put backend domain logic in UI state.

## Default Modules

Frontend modules should mirror product modules:

- `system`
- `admissions`
- `academic`
- `scheduling`
- `finance`
- `reporting`
