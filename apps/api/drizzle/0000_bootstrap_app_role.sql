-- Creates the runtime role used by the API and worker (DATABASE_URL). Migrations,
-- seeding, and Drizzle Studio keep using the owner role (DATABASE_MIGRATE_URL) so
-- schema/RLS changes are never blocked by the runtime role's restricted privileges.
--
-- Runs via `pnpm db:migrate` like any other migration, in every environment
-- (local, CI, staging, production) — not a docker-only bootstrap step.
do $$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'edtech_app') then
    create role edtech_app with
      login
      password 'edtech_app'
      nosuperuser
      nocreatedb
      nocreaterole
      nobypassrls;
  end if;
end
$$;
--> statement-breakpoint
grant usage on schema public to edtech_app;
--> statement-breakpoint
grant select, insert, update, delete on all tables in schema public to edtech_app;
--> statement-breakpoint
grant usage, select on all sequences in schema public to edtech_app;
--> statement-breakpoint
alter default privileges in schema public
  grant select, insert, update, delete on tables to edtech_app;
--> statement-breakpoint
alter default privileges in schema public
  grant usage, select on sequences to edtech_app;