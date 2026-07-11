-- Add tariff_per_sqm and updated_at to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tariff_per_sqm DECIMAL(12,2) NOT NULL DEFAULT 0.40;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
