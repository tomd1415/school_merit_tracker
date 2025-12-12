# School Merit Tracker

A Node.js + Express + PostgreSQL app for running the school's AP reward system. Staff can manage pupils, forms, prizes and orders, sell prizes to pupils, and keep stock and fulfilment in sync. Authentication now uses per-staff username/password with roles.

---

## 1) What it does
- Manage pupils (create/edit/deactivate) and forms/year groups.
- Manage prizes (CRUD, stock adjustments, images, active flag).
- Purchase prizes for pupils with AP checks and prize stock checks.
- Orders & Fulfilment page to see pending/all orders, mark collected, issue refunds (returns APs), filter by year/form/pupil/date, and search pupils with autocomplete.
- CSV upload tools for pupils and AP top-ups.

---

## 2) Auth model
- Staff auth (default ON): username/password stored in `staff_users`, roles in `staff_roles`.
  - `staff` role: purchase flow only (and related APIs).
  - `admin` role: everything.
- Login at `/staff/login`. On success:
  - admin → `/`
  - staff → `/purchase`
- Sessions are cookie-based (`connect.sid`), 1-hour expiry, signed with `SESSION_SECRET` (set in `.env`).

---

## 3) Data model (PostgreSQL)
- Tables: `form`, `pupils`, `prizes`, `purchase`.
- Key fields:
  - `pupils.merits`: total APs available to a pupil.
  - `prizes`: `total_stocked_ever`, `stock_adjustment`, `active`, plus cycle stock (`is_cycle_limited`, `spaces_per_cycle`, `cycle_weeks`, `reset_day_iso`).
  - `purchase`: `status` (`pending`, `collected`, `refunded`), `fulfilled_at`, `active` (legacy flag kept).
- Views:
  - `prize_stock`: total-based stock or cycle-based spaces (spaces per cycle minus purchases since the current cycle start at 02:00 Europe/London on the configured reset day).
  - `pupil_remaining_merits`: merits - active purchases.

**Schema upgrades**  
Existing databases should run:
- `migrations/20240904_purchase_status.sql` to add `status` and `fulfilled_at` to `purchase` and backfill data.
- `migrations/20250314_cycle_stock.sql` to add cycle-based prize stock support (columns, helper function, refreshed `prize_stock` view).
- Required for staff auth: `migrations/20241211_staff_auth.sql` (new tables for staff users/roles/audit).

---

## 4) Frontend pages
- `/` Home with quick links.
- `/pupils` Manage pupils.
- `/forms` Manage forms/year groups.
- `/prizes` Manage prizes (stock inline help, image upload).
- `/purchase` Touch-friendly purchase flow (AP + stock checks, recent pupils, cancel/refund of most recent purchase).
- `/orders` Orders & Fulfilment (pending/all toggle, date range in all mode, filters, autocomplete pupil search, mark collected, refund with AP return).
- `/upload/csv/pupils` Bulk import pupils.
- `/upload/csv/merits` Bulk add APs.
- Common top menu via `public/commonMenu.js` (omits on purchase page by design).

---

## 5) Installation & setup
- Prerequisites: Node 18+, PostgreSQL 14+, `psql` CLI.
- Install dependencies: `npm install`
- Configure `.env` (example):
  ```
  DB_HOST=localhost
  DB_PORT=5432
  DB_USER=merit_user
  DB_PASS=yourpassword
  DB_NAME=merits
  AUTH_ENABLED=true
  ```
  (Ensure the DB user exists and has rights on the target database.)
- Create DB + load schema (fresh install):
  ```
  createdb merits
  psql -U merit_user -d merits -f create_tables.sql
  ```
- Upgrades on existing DB (apply all missing migrations in order):
  ```
  psql -U merit_user -d merits -f migrations/20240904_purchase_status.sql
  psql -U merit_user -d merits -f migrations/20250314_cycle_stock.sql
  psql -U merit_user -d merits -f migrations/20241211_staff_auth.sql
  ```
- Optional test data for local dev: `psql -U merit_user -d merits -f testdata/seed_test_data.sql`
- Run the app: `npm start` (or `node server.js`), then open `http://localhost:3000`.
- First admin user: after enabling auth and running migrations, open `/staff/admin/users` to create the first account (auto-gets `admin`). Subsequent user creation requires an admin login.

## 6) Usage guide
- Prizes (`/prizes`):
  - Toggle between Total stock and Cycle-based spaces per prize. Cycle mode ignores total stock and uses `spaces per cycle`, `cycle weeks` (0 = weekly), and `reset day` (resets 02:00 Europe/London on that day; most recent reset).
  - Inline edit supports dropdowns for cycle weeks and reset day, image drag/drop, and spoiled stock entry (total mode only).
  - “Add stock” works only in total mode; cycle mode uses the spaces-per-cycle field instead.
- Purchase (`/purchase`):
  - Shows current stock or spaces; out-of-stock prizes are disabled.
  - Select a pupil (modal or sidebar), then tap a prize to create a purchase. Remaining APs update on success.
  - “Cancel purchase” refunds the most recent purchase and returns APs.
- Orders (`/orders`):
  - View pending/all, filter by year/form/pupil/date, mark collected, or refund (returns APs).
- Pupils/forms (`/pupils`, `/forms`): CRUD and activate/deactivate.
- CSV uploads:
  - `/upload/csv/pupils`: upload `first_name,last_name,form_id`; skips duplicates.
  - `/upload/csv/merits`: accepts raw “Name, Points, Form Group, Year Group” CSV (aggregates multiple rows per pupil) or converted `first_name,last_name,merits`. Options on the page:
    - Auto-add missing pupils if their form exists.
    - Auto-create missing forms (uses Year Group from CSV).
    - Update existing pupil form to the CSV form.
    - Ignore missing pupils once or forever.
    - APs never decrease; kept-higher APs are reported; missing items include reasons.

## 7) Operations & maintenance
- Migrations: Always run new files in `migrations/` after pulling updates.
- Backups: Back up the Postgres database before migrations or large imports.
- Sessions: In-memory session store; for production, use a persistent store (e.g., Redis) and update `server.js`.
- CSV import ignore list: `merit_import_ignore` stores “ignore forever” pupils for AP imports; truncate it to clear.
- Cron: `schedulers/summaryScheduler.js` runs weekly; ensure email env/config in `services/emailService.js` if you use it.
- Logs: stdout/stderr from Node; consider a process manager (PM2/systemd) for production.
- Tests (current scripts): `npm run test:api`, `npm run test:smoke`, `npm run test:db`, `npm run test:all` (add data/config as needed).
- Backups: `scripts/backup.sh` creates rolling backups (7 daily, 4 weekly, 12 monthly) of the DB and `public/images`. Configure DB env (`DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME`) and optional `BACKUP_ROOT`. Example cron: `0 2 * * * /path/to/scripts/backup.sh >/var/log/merit_backup.log 2>&1`.

## 8) Notable behaviours
- Stock enforcement: purchases blocked when `prize_stock.current_stock <= 0`; out-of-stock prizes are labelled and unclickable in the UI.
- Refunds: Orders page and purchase cancel path set purchase `status = refunded`, deactivate the purchase, and remaining merits refresh via the view.
- Collected: Orders page sets `status = collected` (keeps purchase active for stock counting and history).
- Filters/search: Orders page supports year/form/pupil filters and date range when viewing all orders; pupil search reuses the shared autocomplete.


## 9) Project layout
- `server.js` wiring, routes in `routes/`, controllers in `controllers/`.
- Static assets in `public/` per feature (HTML/CSS/JS). Shared styles in `public/css/`, shared menu in `public/commonMenu.js`.
- Database pool in `db.js`; cron-like jobs in `schedulers/`.
- Migrations in `migrations/`.


## 10) Future considerations
- Move sessions to a persistent store for production.
- Add automated tests for stock/merit edge cases and order state transitions.
- Add email-backed password reset and account lockout.
