CREATE TYPE "public"."system_data_scope_type" AS ENUM('TENANT', 'BRANCH_SET', 'SELF');--> statement-breakpoint
CREATE TYPE "public"."system_login_outcome" AS ENUM('SUCCESS', 'BAD_PASSWORD', 'LOCKED', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."system_user_status" AS ENUM('ACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TABLE "system_login_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"attempted_email" text NOT NULL,
	"ip" text NOT NULL,
	"user_agent" text NOT NULL,
	"outcome" "system_login_outcome" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "system_role_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_role_permissions_role_id_permission_key_unique" UNIQUE("role_id","permission_key")
);
--> statement-breakpoint
CREATE TABLE "system_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_roles_tenant_id_code_unique" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE "system_tenant_modules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_tenant_modules_tenant_id_module_key_unique" UNIQUE("tenant_id","module_key")
);
--> statement-breakpoint
CREATE TABLE "system_user_branches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_user_branches_user_id_branch_id_unique" UNIQUE("user_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "system_user_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_user_roles_user_id_role_id_unique" UNIQUE("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "system_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"status" "system_user_status" DEFAULT 'ACTIVE' NOT NULL,
	"data_scope_type" "system_data_scope_type" DEFAULT 'TENANT' NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_users_tenant_id_email_unique" UNIQUE("tenant_id","email")
);
--> statement-breakpoint
ALTER TABLE "system_login_logs" ADD CONSTRAINT "system_login_logs_tenant_id_system_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."system_tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_login_logs" ADD CONSTRAINT "system_login_logs_user_id_system_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."system_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_role_permissions" ADD CONSTRAINT "system_role_permissions_tenant_id_system_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."system_tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_role_permissions" ADD CONSTRAINT "system_role_permissions_role_id_system_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."system_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_roles" ADD CONSTRAINT "system_roles_tenant_id_system_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."system_tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_tenant_modules" ADD CONSTRAINT "system_tenant_modules_tenant_id_system_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."system_tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_user_branches" ADD CONSTRAINT "system_user_branches_tenant_id_system_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."system_tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_user_branches" ADD CONSTRAINT "system_user_branches_user_id_system_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."system_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_user_branches" ADD CONSTRAINT "system_user_branches_branch_id_system_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."system_branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_user_roles" ADD CONSTRAINT "system_user_roles_tenant_id_system_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."system_tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_user_roles" ADD CONSTRAINT "system_user_roles_user_id_system_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."system_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_user_roles" ADD CONSTRAINT "system_user_roles_role_id_system_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."system_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_users" ADD CONSTRAINT "system_users_tenant_id_system_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."system_tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "system_login_logs_tenant_created_idx" ON "system_login_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "system_role_permissions_tenant_created_idx" ON "system_role_permissions" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "system_roles_tenant_created_idx" ON "system_roles" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "system_user_branches_tenant_created_idx" ON "system_user_branches" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "system_user_roles_tenant_created_idx" ON "system_user_roles" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "system_users_tenant_created_idx" ON "system_users" USING btree ("tenant_id","created_at");