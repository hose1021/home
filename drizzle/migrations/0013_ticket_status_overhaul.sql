ALTER TABLE "tickets" DROP COLUMN IF EXISTS "resolution";
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'pending';
