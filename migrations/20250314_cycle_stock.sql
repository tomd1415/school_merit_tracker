-- Add cycle-limited prize support: columns, helper, and refreshed prize_stock view

-- 1) New columns on prizes
ALTER TABLE prizes
  ADD COLUMN IF NOT EXISTS is_cycle_limited BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS spaces_per_cycle INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_weeks INTEGER NOT NULL DEFAULT 0 CHECK (cycle_weeks >= 0 AND cycle_weeks <= 52),
  ADD COLUMN IF NOT EXISTS reset_day_iso INTEGER NOT NULL DEFAULT 1 CHECK (reset_day_iso >= 1 AND reset_day_iso <= 7);

-- 2) Helper to find the start of the current cycle at 02:00 Europe/London
CREATE OR REPLACE FUNCTION prize_cycle_start(reset_day_iso INTEGER, cycle_weeks INTEGER)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  local_now      TIMESTAMPTZ := now() AT TIME ZONE 'Europe/London';
  interval_weeks INTEGER     := GREATEST(cycle_weeks, 1);
  week_start     TIMESTAMPTZ := date_trunc('week', local_now); -- Monday 00:00 (ISO)
  candidate      TIMESTAMPTZ;
BEGIN
  IF reset_day_iso IS NULL OR reset_day_iso < 1 OR reset_day_iso > 7 THEN
    reset_day_iso := 1; -- default Monday
  END IF;

  candidate := week_start
               + ((reset_day_iso - 1) * INTERVAL '1 day')
               + INTERVAL '2 hours';

  -- If the reset time for this cycle is still in the future, step back by the full interval
  IF local_now < candidate THEN
    candidate := candidate - (interval_weeks * INTERVAL '1 week');
  END IF;

  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

-- 3) Refresh prize_stock view to account for cycle-limited prizes
DROP VIEW IF EXISTS prize_stock;

CREATE VIEW prize_stock AS
SELECT
    p.prize_id,
    p.description,
    CASE
      WHEN p.is_cycle_limited THEN
        GREATEST(
          p.spaces_per_cycle
            - (
                SELECT COUNT(pu.purchase_id)
                  FROM purchase pu
                 WHERE pu.prize_id = p.prize_id
                   AND pu.active = TRUE
                   AND pu.date >= prize_cycle_start(p.reset_day_iso, p.cycle_weeks)
              ),
          0
        )
      ELSE
        p.total_stocked_ever
          + p.stock_adjustment
          - COUNT(pu.purchase_id)::INT
    END AS current_stock
FROM prizes p
LEFT JOIN purchase pu
       ON pu.prize_id = p.prize_id
      AND pu.active = TRUE
GROUP BY
    p.prize_id,
    p.description,
    p.total_stocked_ever,
    p.stock_adjustment,
    p.spaces_per_cycle,
    p.is_cycle_limited,
    p.reset_day_iso,
    p.cycle_weeks;
