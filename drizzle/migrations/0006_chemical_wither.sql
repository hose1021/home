ALTER TABLE "users" RENAME COLUMN "email" TO "username";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
WITH "normalized_users" AS (
  SELECT
    "id",
    trim(both '.' from regexp_replace(lower(trim("full_name")), '[^[:alpha:]]+', '.', 'g')) AS "base_username"
  FROM "users"
),
"ranked_users" AS (
  SELECT
    "id",
    CASE
      WHEN position('.' in "base_username") = 0 THEN "base_username" || '.user'
      ELSE "base_username"
    END AS "base_username",
    row_number() OVER (
      PARTITION BY CASE
        WHEN position('.' in "base_username") = 0 THEN "base_username" || '.user'
        ELSE "base_username"
      END
      ORDER BY "id"
    ) AS "username_number"
  FROM "normalized_users"
)
UPDATE "users" AS "app_user"
SET "username" = "ranked_users"."base_username" || repeat('x', ("ranked_users"."username_number" - 1)::integer)
FROM "ranked_users"
WHERE "app_user"."id" = "ranked_users"."id";--> statement-breakpoint
ALTER TABLE "owners" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verified";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "chk_users_username_format" CHECK ("users"."username" ~ '^[[:alpha:]]+\.[[:alpha:]]+$');
