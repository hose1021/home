ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "is_dashboard" boolean NOT NULL DEFAULT false;
