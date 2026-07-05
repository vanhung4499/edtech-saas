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
