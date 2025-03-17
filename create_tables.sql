-- =========================================================
-- Drop existing objects (views & tables) if they already exist
-- =========================================================

-- Drop views first (they depend on the tables)
DROP VIEW IF EXISTS pupil_remaining_merits;
DROP VIEW IF EXISTS prize_stock;

-- Drop tables in correct order to avoid FK constraint issues
DROP TABLE IF EXISTS purchase;
DROP TABLE IF EXISTS prizes;
DROP TABLE IF EXISTS pupils;
DROP TABLE IF EXISTS form;

-- =========================================================
-- Recreate tables
-- =========================================================

-- 1. form table
CREATE TABLE form (
    form_id     SERIAL PRIMARY KEY,
    form_name   VARCHAR(100) NOT NULL,
    form_tutor  VARCHAR(100) NOT NULL,
    year_group  INTEGER      NOT NULL CHECK (year_group >= 0 AND year_group <= 14),
    active      BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 2. pupils table
CREATE TABLE pupils (
    pupil_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    merits     INTEGER      NOT NULL CHECK (merits >= 0),
    form_id    INTEGER      NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_pupils_form
        FOREIGN KEY (form_id)
        REFERENCES form(form_id)
        ON DELETE NO ACTION
);

-- 3. prizes table
CREATE TABLE prizes (
    prize_id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    description        TEXT         NOT NULL,
    cost_merits        INTEGER      NOT NULL CHECK (cost_merits >= 0),
    cost_money         INTEGER      NOT NULL CHECK (cost_money >= 0),  -- cost in pence
    image_path         VARCHAR(255) NOT NULL,
    total_stocked_ever INTEGER      NOT NULL CHECK (total_stocked_ever >= 0),
    stock_adjustment   INTEGER      NOT NULL,
    active             BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 4. purchase table
CREATE TABLE purchase (
    purchase_id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pupil_id           INTEGER   NOT NULL,
    prize_id           INTEGER   NOT NULL,
    merit_cost_at_time INTEGER   NOT NULL CHECK (merit_cost_at_time >= 0),
    date               TIMESTAMP NOT NULL,
    active             BOOLEAN   NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_purchase_pupil
        FOREIGN KEY (pupil_id)
        REFERENCES pupils(pupil_id)
        ON DELETE NO ACTION,
    CONSTRAINT fk_purchase_prize
        FOREIGN KEY (prize_id)
        REFERENCES prizes(prize_id)
        ON DELETE NO ACTION
);

-- =========================================================
-- Create views
-- =========================================================

-- View to show current stock of prizes
CREATE VIEW prize_stock AS
SELECT
    p.prize_id,
    p.description,
    p.total_stocked_ever
      + p.stock_adjustment
      - COUNT(pu.purchase_id)::INT
      AS current_stock
FROM prizes p
LEFT JOIN purchase pu
       ON p.prize_id = pu.prize_id
       AND pu.active = TRUE
WHERE p.active = TRUE
GROUP BY
    p.prize_id,
    p.description,
    p.total_stocked_ever,
    p.stock_adjustment;

-- View to show remaining merits per pupil
CREATE VIEW pupil_remaining_merits AS
SELECT
    p.pupil_id,
    p.first_name,
    p.last_name,
    p.merits
      - COALESCE(SUM(pu.merit_cost_at_time), 0)
      AS remaining_merits
FROM pupils p
LEFT JOIN purchase pu
       ON p.pupil_id = pu.pupil_id
       AND pu.active = TRUE    -- Only count active purchases
WHERE p.active = TRUE          -- Only show active pupils
GROUP BY
    p.pupil_id,
    p.first_name,
    p.last_name,
    p.merits;

ALTER TABLE purchase OWNER TO merit_user;
ALTER TABLE prizes OWNER TO merit_user;
ALTER TABLE form OWNER TO merit_user;
ALTER TABLE pupils OWNER TO merit_user;
ALTER VIEW prize_stock OWNER TO merit_user;
ALTER VIEW pupil_remaining_merits OWNER TO merit_user;
