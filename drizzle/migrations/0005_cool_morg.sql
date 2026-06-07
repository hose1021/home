UPDATE "owners" AS "owner"
SET "user_id" = "app_user"."id"
FROM "users" AS "app_user"
WHERE "owner"."user_id" IS NULL
  AND "owner"."email" IS NOT NULL
  AND lower("owner"."email") = lower("app_user"."email")
  AND "owner"."tenant_id" = "app_user"."tenant_id";--> statement-breakpoint
INSERT INTO "users" (
  "id",
  "tenant_id",
  "email",
  "phone",
  "full_name",
  "password_hash"
)
SELECT
  gen_random_uuid(),
  "tenant_id",
  'owner-' || "id" || '@local.invalid',
  "phone",
  "full_name",
  '$2b$12$OOVKlugrrisqT3gcxKonQ.G3GJ3Xr0cjBd1knMW0JQZryu.S6cQA6'
FROM "owners"
WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "owners" AS "owner"
SET "user_id" = "app_user"."id",
    "email" = "app_user"."email"
FROM "users" AS "app_user"
WHERE "owner"."user_id" IS NULL
  AND "app_user"."email" = 'owner-' || "owner"."id" || '@local.invalid';--> statement-breakpoint
INSERT INTO "owners" (
  "tenant_id",
  "user_id",
  "full_name",
  "phone",
  "email"
)
SELECT
  "app_user"."tenant_id",
  "app_user"."id",
  "app_user"."full_name",
  "app_user"."phone",
  "app_user"."email"
FROM "users" AS "app_user"
WHERE NOT EXISTS (
  SELECT 1 FROM "owners" WHERE "owners"."user_id" = "app_user"."id"
);--> statement-breakpoint
INSERT INTO "user_roles" ("user_id", "role", "scope_tenant_id")
SELECT "owners"."user_id", 'owner', "owners"."tenant_id"
FROM "owners"
WHERE NOT EXISTS (
  SELECT 1
  FROM "user_roles"
  WHERE "user_roles"."user_id" = "owners"."user_id"
    AND "user_roles"."role" = 'owner'
);--> statement-breakpoint
ALTER TABLE "owners" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "owners" ADD CONSTRAINT "owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owners" ADD CONSTRAINT "owners_user_id_unique" UNIQUE("user_id");
