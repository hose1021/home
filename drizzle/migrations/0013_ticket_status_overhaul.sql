ALTER TABLE "tickets" DROP COLUMN IF EXISTS "resolution";
ALTER TABLE "tickets" ADD COLUMN "rejection_reason" text;
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'pending';
