# School Reward Site

The School Reward Site is a Node.js + PostgreSQL application that tracks pupil merits and allows teachers to “purchase” prizes on behalf of pupils. It’s designed for easy, tablet-friendly interaction, with a custom 6-digit PIN login flow.

---

## 1. Overview

- **Node.js + Express** server with a **PostgreSQL** backend.
- Pupils, Prizes, and Purchases are stored in separate tables. A `pupil_remaining_merits` view calculates each pupil’s remaining merits.
- Two PINs for authentication:
  - **Purchase PIN** for purchase-only access.
  - **Full PIN** for full administrative tasks.
- Teachers can:
  - Manage Pupils (add/edit/delete)
  - Manage Prizes (add/edit/delete/stock)
  - Purchase Prizes (touchscreen-friendly)
  - Upload Pupils CSV (bulk import)
  - Upload Merits CSV (add merits in bulk)

---

## 2. Directory Structure

- **controllers/**  
  Houses controller logic (csvController, pinController, prizeController, pupilController, purchaseController).
  
- **routes/**  
  Contains Express router files (pupilRoutes, prizeRoutes, purchaseRoutes, csvRoutes, pinRoutes) mapping endpoints to controllers.

- **public/**  
  Front-end HTML, CSS, JS for each feature/page (pupils, prizes, purchase, upload CSV, etc.).  
  - Shared scripts like `commonMenu.js` can dynamically insert a top menu and sign-out button on most pages.

- **middlewares/**  
  Contains `auth.js` with `requireFullAccess` and `requirePurchaseAccess` for route protection.

- **server.js**  
  Main entry point for Express. Configures sessions, routes, static file serving.

- **db.js**  
  Connects to PostgreSQL using environment variables.

- **create_tables.sql**  
  Defines schema (form, pupils, prizes, purchase) and views (`prize_stock`, `pupil_remaining_merits`).

- **package.json**  
  Lists Node dependencies (express, pg, csv-parser, multer, etc.).

---

## 3. Authentication & PINs

- `.env` holds `PURCHASE_PIN` and `FULL_PIN`. Teachers enter a 6-digit PIN at `/enter-pin`.  
- If they enter the purchase PIN, they get “purchase” role; if full PIN, “full” role.  
- Session cookie expires after 1 hour (configurable in `server.js`).  
- A “Sign Out” button calls `/logout`, clearing the session.

---

## 4. Menu & Sign Out

- Most pages load `commonMenu.js`, which inserts a top-centered menu and a sign-out button (top-right).
- The Purchase page omits the main menu but still shows a sign-out button.  
- Links in the menu:
  - Manage Pupils
  - Manage Prizes
  - Purchase Prizes
  - Upload Pupils CSV
  - Upload Merits CSV

---

## 5. Managing Pupils

- Pupils can be added, edited (inline or via modal), or set inactive.  
- CSV import (first_name, last_name, form_id) can bulk-insert new pupils.  
- Pupils table tracks `merits` integer; the `pupil_remaining_merits` view subtracts purchased items from this total.

---

## 6. Managing Prizes

- Prizes page lists all prizes. You can add a new prize, upload an image, edit cost, etc.
- A column for stock/stock_adjustment can be updated (planned to be made inline-editable).
- Prizes can be deleted or set inactive. “Current Stock” can be displayed from the `prize_stock` view.

---

## 7. Purchase Prizes

- The purchase page is touchscreen-friendly. Tap a prize, then select a pupil via a search box.
- Deducts the required merits from `pupil_remaining_merits`. If insufficient, blocks purchase.
- A “Cancel Purchase” or “refund” feature is planned to allow reversing mistakes or changes in cost.

---

## 8. Uploading CSVs

- **`/upload/csv/pupils`**: Import new pupils with “first_name,last_name,form_id”. Duplicates are skipped.
- **`/upload/csv/merits`**: Add merits to existing pupils in bulk with “first_name,last_name,merits”. Rows for unknown pupils appear in a “missing” list.

---

## 9. Planned Features

1. **Prize Stock**: Inline editing on the Manage Prizes page to track exact stock or use “stock_adjustment” in real time.
2. **Pupil Self-Check**: Pupils can enter a 6-digit PIN (unique to each pupil) to see their own remaining merits.
3. **Refund / Cost Override**: A button on Purchase to revert or modify a purchase’s cost if needed.

---

## 10. Installation & Setup

1. **Set Up PostgreSQL**  
   - **Install** PostgreSQL on your system.  
   - **Create** a user and a database. For example:
     ```
     sudo -iu postgres
     psql
     CREATE DATABASE merits;
     CREATE USER merit_user WITH ENCRYPTED PASSWORD 'yourpassword';
     GRANT ALL PRIVILEGES ON DATABASE merits TO merit_user;
     \q
     ```
   - **Import** the schema:
     ```
     psql -U merit_user -d merits -f create_tables.sql
     ```
   - If you have sample data, import it too (like `testdata/sampledata.sql`).

2. **Environment Variables (.env)**  
   - Create a `.env` in the project root:
     ```
     DB_HOST=localhost
     DB_PORT=5432
     DB_USER=merit_user
     DB_PASS=yourpassword
     DB_NAME=merits

     PURCHASE_PIN=111111
     FULL_PIN=222222
     ```
   - Adjust values as needed.

3. **Install Node Dependencies**  
   - In the project root:
     ```
     npm install
     ```

4. **Run the Server**  
   - Start the app:
     ```
     node server.js
     ```
     or
     ```
     npm start
     ```
   - By default, it listens on port 3000. Go to http://localhost:3000.

5. **Log In & Use**  
   - At `/enter-pin`, enter either the purchase pin or the full pin.
   - If purchase pin, you can only see “Purchase Prizes.” If full pin, you can manage everything.
   - “Sign Out” or direct to `/logout` to exit your session.

---

## 11. Known Issues / Notes

- All staff currently share the same 6-digit PIN(s). No per-staff accounts yet.
- For production, consider HTTPS and a proper session store (Redis, etc.).
- Pupils don’t have direct logins yet, though you can add a simple “pupil PIN” check if desired.
- The site was tested primarily in a local or intranet environment; not hardened for public exposure.

--------------------------------------------------------------------------------

