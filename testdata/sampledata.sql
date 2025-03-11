TRUNCATE TABLE purchase, prizes, pupils, form RESTART IDENTITY CASCADE;

-- =========================--
-- 1) Insert Forms
-- =========================
INSERT INTO form (form_name, form_tutor, year_group, active)
VALUES
  ('7A',   'Mr. Adams',     7,  true),
  ('7B',   'Ms. Baker',     7,  true),
  ('8A',   'Mr. Carter',    8,  true),
  ('9A',   'Mr. Davis',     9,  true),
  ('10A',  'Ms. Evans',    10,  true),
  ('11B',  'Mr. Fisher',   11,  true);

-- =========================
-- 2) Insert Pupils
--    We'll create 30 pupils (5 per form).
--    Merits vary among them. The form_id references the 6 forms above
--    (serial IDs typically start at 1; adjust if needed).
-- =========================

-- Pupils for form_id = 1 (7A)
INSERT INTO pupils (first_name, last_name, merits, form_id, active)
VALUES
  ('John',   'Smith',   10, 1, true),
  ('Emily',  'Jones',   15, 1, true),
  ('Lucas',  'Taylor',  0,  1, true),
  ('Lily',   'Baker',   5,  1, true),
  ('James',  'Wright',  8,  1, true);

-- Pupils for form_id = 2 (7B)
INSERT INTO pupils (first_name, last_name, merits, form_id, active)
VALUES
  ('Sophia',  'Hughes',  12, 2, true),
  ('Oliver',  'Green',   4,  2, true),
  ('Chloe',   'Hall',    2,  2, true),
  ('Noah',    'Clark',   20, 2, true),
  ('Mia',     'Walker',  1,  2, true);

-- Pupils for form_id = 3 (8A)
INSERT INTO pupils (first_name, last_name, merits, form_id, active)
VALUES
  ('Ava',     'Harris',  9,  3, true),
  ('Ethan',   'Lewis',   3,  3, true),
  ('Amelia',  'Roberts', 7,  3, true),
  ('Jacob',   'Bennett', 11, 3, true),
  ('Layla',   'Price',   0,  3, true);

-- Pupils for form_id = 4 (9A)
INSERT INTO pupils (first_name, last_name, merits, form_id, active)
VALUES
  ('Isaac',   'Wood',    6,  4, true),
  ('Grace',   'Edwards', 15, 4, true),
  ('Daniel',  'Fox',     2,  4, true),
  ('Freya',   'Bell',    14, 4, true),
  ('Ben',     'Bryant',  6,  4, true);

-- Pupils for form_id = 5 (10A)
INSERT INTO pupils (first_name, last_name, merits, form_id, active)
VALUES
  ('Emma',    'Bailey',   13, 5, true),
  ('Logan',   'Cooper',   8,  5, true),
  ('Megan',   'Mills',    3,  5, true),
  ('Zoe',     'Shaw',     9,  5, true),
  ('Henry',   'Gray',     4,  5, true);

-- Pupils for form_id = 6 (11B)
INSERT INTO pupils (first_name, last_name, merits, form_id, active)
VALUES
  ('Ellie',   'Long',     25, 6, true),
  ('Evan',    'Sharp',    18, 6, true),
  ('Anna',    'Owen',     2,  6, true),
  ('Dylan',   'Reid',     10, 6, true),
  ('Heidi',   'Pearson',  5,  6, true);

-- =========================
-- 3) Insert Prizes
--    We'll create 6 prizes with varied costs.
--    cost_money is in pence (e.g., 199 = £1.99).
-- =========================
INSERT INTO prizes
  (description, cost_merits, cost_money, image_path, total_stocked_ever, stock_adjustment, active)
VALUES
  ('Blue Pen',          5,   99,   '/images/blue_pen.png',      50,  0,  true),
  ('School T-Shirt',   15,  799,   '/images/tshirt.png',        30,  5,  true),
  ('Notebook',          8,   199,  '/images/notebook.png',      40,  0,  true),
  ('Water Bottle',      10,  299,  '/images/water_bottle.png',  25,  0,  true),
  ('USB Flash Drive',   20,  699,  '/images/usb_drive.png',     15,  0,  true),
  ('Headphones',        25,  1299, '/images/headphones.png',    10,  2,  true);

-- =========================
-- 4) Insert Purchases
--    We'll create 12 example purchase records.
--    * "merit_cost_at_time" should match the cost in merits used at the time of purchase
--    * "date" is a timestamp
--    * "active" = true (or you could set some to false if you want to test "voided" purchases)
--    Make sure the pupil_id and prize_id reference actual inserted IDs
--    (pupils start at 1..30, prizes start at 1..6, typically).
-- =========================

INSERT INTO purchase (pupil_id, prize_id, merit_cost_at_time, date, active)
VALUES
  (1,   1,   5,   '2025-03-01 10:15:00', true),  -- John Smith buys Blue Pen
  (2,   3,   8,   '2025-03-01 11:00:00', true),  -- Emily Jones buys Notebook
  (9,   2,   15,  '2025-03-02 09:30:00', true),  -- Mia Walker buys T-Shirt
  (15,  5,   20,  '2025-03-02 14:45:00', true),  -- Layla Price buys USB Drive
  (18,  1,   5,   '2025-03-03 08:20:00', true),  -- Daniel Fox buys Blue Pen
  (23,  2,   15,  '2025-03-03 10:10:00', true),  -- Megan Mills buys T-Shirt
  (28,  4,   10,  '2025-03-04 13:05:00', true),  -- Anna Owen buys Water Bottle
  (30,  3,   8,   '2025-03-04 15:00:00', true),  -- Heidi Pearson buys Notebook
  (19,  6,   25,  '2025-03-05 09:00:00', true),  -- Grace Edwards buys Headphones
  (25,  1,   5,   '2025-03-05 11:30:00', true),  -- Emma Bailey buys Blue Pen
  (26,  4,   10,  '2025-03-06 16:00:00', true),  -- Logan Cooper buys Water Bottle
  (28,  6,   25,  '2025-03-07 10:00:00', true);  -- Anna Owen also buys Headphones

-- Done!
-- This script should create 6 forms, 30 pupils, 6 prizes, and 12 purchase records,
-- giving you a good test dataset for your application.

