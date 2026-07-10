# Template: Frontend Operator Screen

Use for internal SaaS screens.

## Structure

```txt
modules/<module>/
  pages-or-routes/
  components/
  forms/
  queries/
  mutations/
  schemas/
```

## Default List Screen

Use:

- `PageHeader`
- `DataToolbar`
- `DataTable`
- `StatusBadge`
- `DetailDrawer`

## Default Form Screen

Use:

- React Hook Form
- Zod validation
- shadcn/ui form components
- sectioned layout
- sticky action bar if long

## Rules

- Build workflow screens, not marketing pages.
- Prefer tables and drawers over decorative cards.
- Use existing UI components before creating new ones.
- Do not invent new colors.
- Do not embed backend business rules in frontend-only logic.
- API types come from the generated OpenAPI client — never hand-write
  request/response interfaces.
- Gate menus/actions by permission keys from `/auth/me`; the API remains the
  enforcement.
- Branch-scoped screens take the working branch from the URL/switcher and pass
  it explicitly as a filter or DTO field.
- User-facing messages map the API `code` to the vi-VN dictionary; never render
  the raw English `message` except as fallback (show `traceId` on unknown
  errors).
- Money is integer VND from the API; format with
  `Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })`, never
  compute money client-side.
