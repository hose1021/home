UPDATE "charge_templates"
SET "calculation" = 'fixed_per_unit', "is_active" = false
WHERE "calculation" = 'per_area_sqm';--> statement-breakpoint
UPDATE "votes"
SET "vote_weight" = 1
WHERE "voting_id" IN (
  SELECT "id" FROM "votings" WHERE "counting_method" = 'by_area'
);--> statement-breakpoint
UPDATE "votings"
SET "counting_method" = 'one_per_owner'
WHERE "counting_method" = 'by_area';--> statement-breakpoint
ALTER TABLE "units" DROP COLUMN "living_area";--> statement-breakpoint
ALTER TABLE "units" DROP COLUMN "room_count";
