# School Merit Tracker

A Node.js + Express + PostgreSQL app for running the school's AP reward system. Staff can manage pupils, forms, prizes and orders, sell prizes to pupils, and keep stock and fulfilment in sync. Authentication uses PIN-based roles for purchase-only or full access.

---

## 1) What it does
- Manage pupils (create/edit/deactivate) and forms/year groups.
- Manage prizes (CRUD, stock adjustments, images, active flag).
- Purchase prizes for pupils with AP checks and prize stock checks.
- Orders & Fulfilment page to see pending/all orders, mark collected, issue refunds (returns APs), filter by year/form/pupil/date, and search pupils with autocomplete.
- CSV upload tools for pupils and AP top-ups.

---

## 2) Auth model
- PIN-based session roles:
  - `purchase` role: access purchase flow and orders.
  - `full` role: access everything.
- PINs come from `.env` (`PURCHASE_PIN`, `FULL_PIN`). Session is stored in memory with 1-hour expiry.

---

## 3) Data model (PostgreSQL)
- Tables: `form`, `pupils`, `prizes`, `purchase`.
- Key fields:
  - `pupils.merits`: total APs available to a pupil.
  - `prizes`: `total_stocked_ever`, `stock_adjustment`, `active`.
  - `purchase`: `status` (`pending`, `collected`, `refunded`), `fulfilled_at`, `active` (legacy flag kept).
- Views:
  - `prize_stock`: total_stocked_ever + stock_adjustment - active purchases.
  - `pupil_remaining_merits`: merits - active purchases.

**Schema upgrades**  
Existing databases should run `migrations/20240904_purchase_status.sql` to add `status` and `fulfilled_at` to `purchase` and backfill data.

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

## 5) Running locally
1. Install dependencies: `npm install`
2. Configure `.env`:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=merit_user
   DB_PASS=yourpassword
   DB_NAME=merits
   PURCHASE_PIN=111111
   FULL_PIN=222222
   ```
3. Create DB and load schema (fresh):  
   `psql -U merit_user -d merits -f create_tables.sql`
4. If upgrading an existing DB, run the migration:  
   `psql -U merit_user -d merits -f migrations/20240904_purchase_status.sql`
5. Start server: `npm start` (or `node server.js`), then visit `http://localhost:3000`.

---

## 6) Notable behaviours
- Stock enforcement: purchases blocked when `prize_stock.current_stock <= 0`; out-of-stock prizes are labelled and unclickable in the UI.
- Refunds: Orders page and purchase cancel path set purchase `status = refunded`, deactivate the purchase, and remaining merits refresh via the view.
- Collected: Orders page sets `status = collected` (keeps purchase active for stock counting and history).
- Filters/search: Orders page supports year/form/pupil filters and date range when viewing all orders; pupil search reuses the shared autocomplete.

---

## 7) Project layout
- `server.js` wiring, routes in `routes/`, controllers in `controllers/`.
- Static assets in `public/` per feature (HTML/CSS/JS). Shared styles in `public/css/`, shared menu in `public/commonMenu.js`.
- Database pool in `db.js`; cron-like jobs in `schedulers/`.
- Migrations in `migrations/`.

---

## 8) Future considerations
- Move sessions to a persistent store for production.
- Harden auth beyond shared PINs.
- Add automated tests for stock/merit edge cases and order state transitions. 
