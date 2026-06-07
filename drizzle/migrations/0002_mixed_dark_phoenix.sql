ALTER TABLE "units" ADD COLUMN "living_area" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "room_count" integer;--> statement-breakpoint
UPDATE "votings"
SET "counting_method" = 'one_per_owner', "max_votes_per_owner" = 1;--> statement-breakpoint
ALTER TABLE "votings" ADD CONSTRAINT "chk_votings_one_per_owner" CHECK ("votings"."counting_method" = 'one_per_owner');--> statement-breakpoint
WITH "ranked_votes" AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "voting_id", "owner_id"
      ORDER BY "created_at", "id"
    ) AS "vote_number"
  FROM "votes"
)
DELETE FROM "votes"
WHERE "id" IN (
  SELECT "id" FROM "ranked_votes" WHERE "vote_number" > 1
);--> statement-breakpoint
UPDATE "votes" SET "vote_weight" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_votes_voting_owner" ON "votes" USING btree ("voting_id","owner_id");--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "chk_votes_weight_one" CHECK ("votes"."vote_weight" = 1);
