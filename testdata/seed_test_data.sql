-- Test seed data for school_merit_tracker
-- Use psql -f testdata/seed_test_data.sql to reset and load the dataset.

BEGIN;

-- Reset existing data so IDs line up with the references below.
TRUNCATE TABLE purchase, prizes, pupils, form RESTART IDENTITY CASCADE;

-- 1) Forms
INSERT INTO form (form_name, form_tutor, year_group, active) VALUES
  ('7 Ash',     'Mrs. Rees',     7,  true),
  ('7 Oak',     'Mr. Holt',      7,  true),
  ('8 Maple',   'Ms. Iqbal',     8,  true),
  ('8 Willow',  'Mr. Douglas',   8,  false), -- retired form for edge-case checks
  ('9 Cedar',   'Mrs. Kemp',     9,  true),
  ('10 Elm',    'Mr. Patel',    10,  true),
  ('11 Pine',   'Ms. Wang',    11,  false),
  ('12 Redwood','Mrs. Nichols', 12,  true);

-- 2) Pupils (mixed active/inactive, varying merits)
INSERT INTO pupils (first_name, last_name, merits, form_id, active) VALUES
  ('Harriet', 'Rowe',       12, 1, true),
  ('Samir',   'Nasser',      7, 1, true),
  ('Poppy',   'Banks',       4, 1, true),
  ('Tyler',   'Adams',      15, 1, true),
  ('Jade',    'Fernandes',   9, 1, false),
  ('Rahul',   'Desai',      20, 2, true),
  ('Megan',   'Webb',        6, 2, true),
  ('Toby',    'Gill',       11, 2, true),
  ('Ella',    'Choi',        3, 2, true),
  ('Marcus',  'White',       5, 2, false),
  ('Lucas',   'Grant',       8, 3, true),
  ('Chloe',   'Marsh',      14, 3, true),
  ('Noah',    'Ibrahim',     2, 3, true),
  ('Sienna',  'Clark',      18, 3, true),
  ('Omar',    'Ali',         0, 3, true),
  ('Priya',   'Singh',       7, 4, true),
  ('Ethan',   'Doyle',       9, 4, false),
  ('Dylan',   'Shore',      12, 5, true),
  ('Freya',   'Patel',       7, 5, true),
  ('Isaac',   'Lowe',       16, 5, true),
  ('Niamh',   'Carter',     10, 5, true),
  ('Violet',  'Reed',       32, 6, true),
  ('Josh',    'Silva',       5, 6, true),
  ('Amira',   'Khan',        9, 6, true),
  ('Ben',     'Stokes',     13, 6, true),
  ('Claudia', 'Ruiz',       17, 7, false),
  ('Oliver',  'Fox',        42, 8, true),
  ('Grace',   'Liu',        24, 8, true),
  ('Kevin',   'Tran',        6, 8, true);

-- 3) Prizes (active and retired items, with stock adjustments)
INSERT INTO prizes
  (description,             cost_merits, cost_money, image_path,                total_stocked_ever, stock_adjustment, active) VALUES
  ('Sticker Pack',                 3,          0,  '/images/sticker_pack.png',           120,              -5, true),
  ('Reusable Straw Set',           6,        250,  '/images/reusable_straw.png',          40,               5, true),
  ('Sketchbook',                  10,        599,  '/images/sketchbook.png',             30,               0, true),
  ('Lunch Queue Fast Pass',       12,          0,  '/images/fast_pass.png',              10,              -1, true),
  ('School Hoodie',               28,       2499,  '/images/hoodie.png',                 12,               2, true),
  ('Bluetooth Speaker',           40,       2999,  '/images/speaker.png',                 6,               0, true),
  ('School Badge (Retired)',       2,         99,  '/images/badge.png',                  80,             -10, false),
  ('Exam Revision Guide',         15,       1099,  '/images/revision_guide.png',         25,              -3, true);

-- 4) Purchases (mix of active/voided rows spanning prizes/pupils)
INSERT INTO purchase (pupil_id, prize_id, merit_cost_at_time, date, active) VALUES
  ( 1, 3, 10, '2025-02-10 09:05:00', true),  -- Harriet buys Sketchbook
  ( 2, 1,  3, '2025-02-10 09:15:00', true),  -- Samir buys Sticker Pack
  ( 4, 4, 12, '2025-02-11 11:30:00', true),  -- Tyler buys Fast Pass
  ( 6, 2,  6, '2025-02-12 08:45:00', true),  -- Rahul buys Straw Set
  ( 6, 4, 12, '2025-02-12 15:10:00', true),  -- Rahul buys Fast Pass again
  ( 7, 1,  3, '2025-02-13 10:05:00', true),  -- Megan buys Sticker Pack
  ( 8, 3, 10, '2025-02-13 14:25:00', true),  -- Toby buys Sketchbook
  (11, 2,  6, '2025-02-14 09:00:00', true),  -- Lucas buys Straw Set
  (12, 4, 12, '2025-02-14 09:20:00', true),  -- Chloe buys Fast Pass
  (14, 8, 15, '2025-02-15 13:40:00', true),  -- Sienna buys Revision Guide
  (16, 7,  2, '2025-02-16 08:55:00', true),  -- Priya buys retired Badge
  (18, 2,  6, '2025-02-16 10:30:00', true),  -- Dylan buys Straw Set
  (19, 1,  3, '2025-02-16 11:00:00', true),  -- Freya buys Sticker Pack
  (20, 8, 15, '2025-02-17 09:10:00', true),  -- Isaac buys Revision Guide
  (21, 3, 10, '2025-02-17 09:25:00', true),  -- Niamh buys Sketchbook
  (22, 5, 28, '2025-02-18 12:00:00', true),  -- Violet buys Hoodie
  (23, 1,  3, '2025-02-18 15:05:00', true),  -- Josh buys Sticker Pack
  (24, 2,  6, '2025-02-19 10:10:00', true),  -- Amira buys Straw Set
  (25, 4, 12, '2025-02-19 14:00:00', true),  -- Ben buys Fast Pass
  (27, 6, 40, '2025-02-20 16:45:00', true),  -- Oliver buys Bluetooth Speaker
  (28, 8, 15, '2025-02-21 09:35:00', true),  -- Grace buys Revision Guide
  (28, 2,  6, '2025-02-21 15:15:00', true),  -- Grace buys Straw Set
  (10, 1,  3, '2025-02-22 10:00:00', false), -- Marcus purchase voided (inactive pupil + inactive purchase)
  (17, 2,  6, '2025-02-22 11:10:00', false); -- Ethan purchase voided (inactive pupil)

COMMIT;
