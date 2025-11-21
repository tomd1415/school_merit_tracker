-- Adds status tracking and fulfilment timestamp to purchases.
-- Run this against your database for existing installs:
--   psql -U <user> -d <db> -f migrations/20240904_purchase_status.sql

-- 1) New columns
ALTER TABLE purchase
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE purchase
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP NULL;

-- 2) Enforce known statuses
ALTER TABLE purchase DROP CONSTRAINT IF EXISTS purchase_status_valid;
ALTER TABLE purchase ADD CONSTRAINT purchase_status_valid
  CHECK (status IN ('pending', 'collected', 'refunded'));

-- 3) Backfill existing rows
--    Treat previously inactive rows as refunded (they were effectively canceled)
UPDATE purchase
SET status = CASE
              WHEN active = FALSE THEN 'refunded'
              ELSE COALESCE(status, 'pending')
            END
WHERE status IS NULL
   OR active = FALSE;

-- Populate fulfilled_at for already-inactive rows so we have a completion timestamp
UPDATE purchase
SET fulfilled_at = COALESCE(fulfilled_at, NOW())
WHERE status = 'refunded';
